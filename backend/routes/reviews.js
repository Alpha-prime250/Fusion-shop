const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/review');
const Product = require('../models/product');
const Order = require('../models/order');
const auth = require('../middleware/auth');
const { loadUser } = require('../middleware/role');

const router = express.Router();

async function recalculateProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const { avgRating = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, {
    rating: Math.round(avgRating * 10) / 10,
    numReviews: count,
  });
}

// Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Submit a review (one per user per product). Requires login.
router.post('/product/:productId', auth, loadUser, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const existing = await Review.findOne({ product: productId, user: req.currentUser._id });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product. Edit your existing review instead.' });
    }

    // Verified purchase: does this user have a delivered/placed order containing this product?
    const hasOrdered = await Order.exists({
      $or: [{ user: req.currentUser._id }, { email: req.currentUser.email }],
      'items.productId': productId,
    });

    const review = new Review({
      product: productId,
      user: req.currentUser._id,
      userName: req.currentUser.name,
      rating,
      title,
      comment: comment.trim(),
      verifiedPurchase: !!hasOrdered,
    });

    await review.save();
    await recalculateProductRating(productId);

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You have already reviewed this product.' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Update own review
router.put('/:reviewId', auth, loadUser, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.user.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own review' });
    }

    const { rating, title, comment } = req.body;
    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;

    await review.save();
    await recalculateProductRating(review.product);

    res.json(review);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete own review (or admin can delete any)
router.delete('/:reviewId', auth, loadUser, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const isOwner = review.user.toString() === req.currentUser._id.toString();
    if (!isOwner && req.currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    const productId = review.product;
    await review.deleteOne();
    await recalculateProductRating(productId);

    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
