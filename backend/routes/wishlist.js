const express = require('express');
const User = require('../models/user');
const Product = require('../models/product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get current user's wishlist (populated with product details)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.wishlist);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Add a product to wishlist
router.post('/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const user = await User.findById(req.user.id);
    if (!user.wishlist.some(id => id.toString() === productId)) {
      user.wishlist.push(productId);
      await user.save();
    }
    const populated = await User.findById(req.user.id).populate('wishlist');
    res.json(populated.wishlist);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Remove a product from wishlist
router.delete('/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();
    const populated = await User.findById(req.user.id).populate('wishlist');
    res.json(populated.wishlist);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
