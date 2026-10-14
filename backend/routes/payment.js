const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { randomInt } = require('crypto');
const Razorpay = require('razorpay');
const Product = require('../models/product');
const Order = require('../models/order');
const auth = require('../middleware/auth');
const { notifyUser } = require('../services/notify');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const STATUS_FLOW = Order.STATUS_FLOW || [];

async function generateOrderNumber() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = `FE-${randomInt(100000, 999999)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Order.exists({ orderNumber: candidate });
    if (!exists) return candidate;
  }
  return `FE-${Date.now()}`;
}

/**
 * Step 1: Create a Razorpay order for the given cart. Amount is calculated
 * server-side from live product prices — never trust a client-sent total.
 */
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const productIds = [...new Set(items.map(item => item.productId || item.id))];
    if (productIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'Invalid product reference in cart' });
    }

    const products = await Product.find({ _id: { $in: productIds } }).lean();
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products are no longer available.' });
    }
    const productMap = new Map(products.map(p => [String(p._id), p]));

    let total = 0;
    for (const item of items) {
      const productId = item.productId || item.id;
      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      total += productMap.get(String(productId)).price * quantity;
    }

    // Razorpay expects the amount in the smallest currency unit (paise for INR)
    const amountInPaise = Math.round(total * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      total,
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    res.status(500).json({ error: 'Failed to initiate Razorpay payment' });
  }
});

/**
 * Step 2: Verify the payment signature Razorpay returns to the frontend
 * (razorpay_order_id + razorpay_payment_id + razorpay_signature), then
 * create the actual Order document. This route is where card-less
 * (UPI/wallet/netbanking) Razorpay payments get confirmed server-side.
 */
router.post('/razorpay/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      items,
      name,
      email,
      shippingAddress,
      shippingLat,
      shippingLng,
      userId,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing Razorpay payment details' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
    }

    if (!Array.isArray(items) || !items.length || !name || !email || !shippingAddress) {
      return res.status(400).json({ error: 'Missing order details' });
    }

    const productIds = [...new Set(items.map(item => item.productId || item.id))];
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products are no longer available.' });
    }
    const productMap = new Map(products.map(p => [String(p._id), p]));

    const orderItems = items.map(item => {
      const productId = item.productId || item.id;
      const product = productMap.get(String(productId));
      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      return {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
        vendor: product.vendor || null,
      };
    });

    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = await generateOrderNumber();
    const estimatedDelivery = new Date(Date.now() + randomInt(2, 6) * 24 * 60 * 60 * 1000);

    const order = new Order({
      orderNumber,
      user: userId || null,
      email: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      shippingAddress: String(shippingAddress).trim(),
      shippingLat,
      shippingLng,
      items: orderItems,
      total,
      estimatedDelivery,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PAID',
      razorpayOrderId,
      razorpayPaymentId,
    });
    order.ensureInitialStatus();
    await order.save();

    if (userId) {
      await notifyUser({
        userId,
        type: 'ORDER_PLACED',
        title: 'Order placed successfully',
        message: `Your order ${orderNumber} was placed and paid via Razorpay.`,
        link: `/order-tracking?orderNumber=${orderNumber}`,
      });
    }

    // Notify each vendor whose product was purchased
    const vendorIds = [...new Set(orderItems.filter(i => i.vendor).map(i => String(i.vendor)))];
    await Promise.all(
      vendorIds.map(vendorId =>
        notifyUser({
          userId: vendorId,
          type: 'NEW_ORDER_FOR_VENDOR',
          title: 'New order received',
          message: `Order ${orderNumber} includes one of your products.`,
          link: `/vendor/orders`,
        })
      )
    );

    res.status(201).json({
      message: 'Payment verified and order created successfully!',
      orderNumber,
      estimatedDelivery,
      statusHistory: order.statusHistory,
      statusFlow: STATUS_FLOW,
      items: orderItems,
      total,
    });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
