const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../models/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../utils/config');

function register(req, res) {
  const { name, email, password, role } = req.body;

  // check if email already taken
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // only allow setting role if the requester is admin (or if no users exist yet — first user becomes admin)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  let assignedRole = 'viewer'; // default

  if (userCount === 0) {
    // first user is always admin — makes setup easier
    assignedRole = 'admin';
  } else if (role && req.user && req.user.role === 'admin') {
    // only admins can assign roles during registration
    if (['viewer', 'analyst', 'admin'].includes(role)) {
      assignedRole = role;
    }
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const stmt = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, email, hashedPassword, assignedRole);

  const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.status(201).json({
    message: 'User created',
    user: { id: result.lastInsertRowid, name, email, role: assignedRole },
    token,
  });
}

function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({
    message: 'Login successful',
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  });
}

module.exports = { register, login };
