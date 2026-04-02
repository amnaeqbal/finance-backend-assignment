const { db } = require('../models/db');

function getAllUsers(req, res) {
  const users = db.prepare(
    'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
  ).all();

  res.json({ users });
}

function getUserById(req, res) {
  const user = db.prepare(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}

function updateUserRole(req, res) {
  const { role } = req.body;
  const userId = req.params.id;

  if (!role || !['viewer', 'analyst', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be viewer, analyst, or admin' });
  }

  // don't let admins demote themselves — that's a footgun
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: "You can't change your own role" });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

  res.json({ message: `Role updated to ${role}` });
}

function toggleUserStatus(req, res) {
  const userId = req.params.id;

  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: "You can't deactivate yourself" });
  }

  const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newStatus = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, userId);

  res.json({
    message: newStatus ? 'User activated' : 'User deactivated',
  });
}

module.exports = { getAllUsers, getUserById, updateUserRole, toggleUserStatus };
