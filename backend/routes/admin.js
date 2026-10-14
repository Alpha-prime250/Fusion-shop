const express = require('express');
const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const Review = require('../models/review');
const auth = require('../middleware/auth');
const { loadUser, requireRole } = require('../middleware/role');
const { notifyUser } = require('../services/notify');

const router = express.Router();

// Every route in this file requires a logged-in admin
router.use(auth, loadUser, requireRole('admin'));

// ---------- Dashboard summary ----------
router.get('/summary', async (req, res) => {
  try {
    const [userCount, vendorCount, pendingVendorCount, productCount, orderCount, revenueAgg] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'vendor' }),
      User.countDocuments({ role: 'vendor', 'vendorProfile.approved': false }),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
    ]);

    res.json({
      userCount,
      vendorCount,
      pendingVendorCount,
      productCount,
      orderCount,
      totalRevenue: revenueAgg[0]?.total || 0,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// ---------- Users & vendors ----------
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Approve a pending vendor account
router.put('/users/:id/approve-vendor', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'vendor') return res.status(404).json({ error: 'Vendor not found' });

    user.vendorProfile.approved = true;
    await user.save();

    await notifyUser({
      userId: user._id,
      type: 'VENDOR_APPROVED',
      title: 'Your vendor account was approved',
      message: 'You can now list products on the marketplace.',
      link: '/vendor/products',
    });

    res.json(user.toSafeObject());
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to approve vendor' });
  }
});

// Activate / deactivate any account
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: !!isActive }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Promote/demote role (e.g. make someone admin)
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ---------- Products (any vendor) ----------
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().populate('vendor', 'name email vendorProfile.storeName').sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.put('/products/:id/approve', async (req, res) => {
  try {
    const { isApproved } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { isApproved: !!isApproved }, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update product approval' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ---------- Orders (all vendors/customers) ----------
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.put('/orders/:id/advance', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.advanceStatus();
    await order.save();

    if (order.user) {
      const latest = order.statusHistory[order.statusHistory.length - 1];
      await notifyUser({
        userId: order.user,
        type: 'ORDER_STATUS',
        title: `Order ${order.orderNumber}: ${latest.label}`,
        message: latest.description,
        link: `/order-tracking?orderNumber=${order.orderNumber}`,
      });
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to advance order status' });
  }
});

// ---------- Reviews moderation ----------
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
