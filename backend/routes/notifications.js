const express = require('express');
const Notification = require('../models/notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Get current user's notifications (most recent first)
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark one notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true }, { new: true });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Delete a notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
