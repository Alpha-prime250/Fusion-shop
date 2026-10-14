const Notification = require('../models/notification');

/**
 * Creates an in-app notification for a user. Fire-and-forget: never throws,
 * so a notification failure never breaks the calling flow (e.g. checkout).
 */
async function notifyUser({ userId, type = 'GENERAL', title, message, link = '' }) {
  if (!userId) return null;
  try {
    return await Notification.create({ user: userId, type, title, message, link });
  } catch (err) {
    console.error('notifyUser failed:', err.message);
    return null;
  }
}

module.exports = { notifyUser };
