const jwt = require('jsonwebtoken');
const { db } = require('../models/db');
const { JWT_SECRET } = require('../utils/config');

// pulls user from JWT token and attaches to req
// if no token or invalid token, returns 401
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE id = ?').get(payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// role-based access — takes allowed roles as arguments
// usage: authorize('admin', 'analyst')
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
