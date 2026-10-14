const User = require('../models/user');

/**
 * Loads the full user document onto req.currentUser.
 * Must run AFTER the auth middleware (which sets req.user.id from JWT).
 */
async function loadUser(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ msg: 'This account has been deactivated. Contact support.' });
    }
    req.currentUser = user;
    next();
  } catch (err) {
    console.error('loadUser error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
}

/**
 * Restricts a route to one or more roles.
 * Usage: router.get('/', auth, loadUser, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ msg: 'Authorization required' });
    }
    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).json({ msg: `Access denied. Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { loadUser, requireRole };
