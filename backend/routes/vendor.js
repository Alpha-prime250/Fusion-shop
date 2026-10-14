const express = require('express');
const Product = require('../models/product');
const Order = require('../models/order');
const auth = require('../middleware/auth');
const { loadUser, requireRole } = require('../middleware/role');

const router = express.Router();

// Every route here requires a logged-in vendor
router.use(auth, loadUser, requireRole('vendor'));

// Block unapproved vendors from managing anything except viewing their own status
function requireApproved(req, res, next) {
  if (!req.currentUser.vendorProfile?.approved) {
    return res.status(403).json({ error: 'Your vendor account is pending admin approval.' });
  }
  next();
}

// ---------- Vendor dashboard summary ----------
router.get('/summary', async (req, res) => {
  try {
    const vendorId = req.currentUser._id;
    const [productCount, orders] = await Promise.all([Product.countDocuments({ vendor: vendorId }), Order.find({ 'items.vendor': vendorId }).lean()]);

    let revenue = 0;
    let unitsSold = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        if (String(item.vendor) === String(vendorId)) {
          revenue += item.price * item.quantity;
          unitsSold += item.quantity;
        }
      });
    });

    res.json({
      approved: !!req.currentUser.vendorProfile?.approved,
      productCount,
      orderCount: orders.length,
      unitsSold,
      revenue,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to load vendor summary' });
  }
});

// ---------- Vendor's own products ----------
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.currentUser._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch your products' });
  }
});

router.post('/products', requireApproved, async (req, res) => {
  try {
    const { name, description, price, category, image, brand, stock } = req.body;
    if (!name || !description || price === undefined || !category || !image) {
      return res.status(400).json({ error: 'name, description, price, category, and image are required' });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      image,
      brand,
      stock: stock || 0,
      vendor: req.currentUser._id,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A product with this name already exists' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', requireApproved, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, vendor: req.currentUser._id });
    if (!product) return res.status(404).json({ error: 'Product not found or not owned by you' });

    const editableFields = ['name', 'description', 'price', 'category', 'image', 'brand', 'stock'];
    editableFields.forEach(field => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', requireApproved, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, vendor: req.currentUser._id });
    if (!product) return res.status(404).json({ error: 'Product not found or not owned by you' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ---------- Vendor's orders (orders containing at least one of their products) ----------
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find({ 'items.vendor': req.currentUser._id })
      .sort({ createdAt: -1 })
      .lean();

    // Only expose line items that belong to this vendor, not the whole order
    const scoped = orders.map(order => ({
      ...order,
      items: order.items.filter(item => String(item.vendor) === String(req.currentUser._id)),
    }));

    res.json(scoped);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch your orders' });
  }
});

module.exports = router;
