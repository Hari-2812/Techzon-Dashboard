const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

exports.auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Middleware to check roles
exports.checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Insufficient role' });
    }
    next();
  };
};
