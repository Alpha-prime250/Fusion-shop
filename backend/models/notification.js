const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['ORDER_STATUS', 'ORDER_PLACED', 'VENDOR_APPROVED', 'NEW_ORDER_FOR_VENDOR', 'REVIEW_RECEIVED', 'GENERAL'],
      default: 'GENERAL',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: '' }, // frontend route to navigate to on click
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
