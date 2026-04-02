const { db } = require('../models/db');

function createRecord(req, res) {
  const { amount, type, category, date, notes } = req.body;

  const stmt = db.prepare(
    'INSERT INTO records (user_id, amount, type, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(req.user.id, amount, type, category.trim(), date, notes || null);

  res.status(201).json({
    message: 'Record created',
    record: { id: result.lastInsertRowid, amount, type, category, date, notes },
  });
}

function getRecords(req, res) {
  // building query dynamically based on filters
  // not the prettiest approach but it works and it's readable
  let query = 'SELECT * FROM records WHERE is_deleted = 0';
  const params = [];

  if (req.query.type) {
    query += ' AND type = ?';
    params.push(req.query.type);
  }

  if (req.query.category) {
    query += ' AND category = ?';
    params.push(req.query.category);
  }

  if (req.query.start_date) {
    query += ' AND date >= ?';
    params.push(req.query.start_date);
  }

  if (req.query.end_date) {
    query += ' AND date <= ?';
    params.push(req.query.end_date);
  }

  // search in notes — simple LIKE search, good enough for this
  if (req.query.search) {
    query += ' AND notes LIKE ?';
    params.push(`%${req.query.search}%`);
  }

  // simple pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // get total count for pagination info
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countQuery).get(...params);

  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const records = db.prepare(query).all(...params);

  res.json({
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

function getRecordById(req, res) {
  const record = db.prepare('SELECT * FROM records WHERE id = ? AND is_deleted = 0').get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.json({ record });
}

function updateRecord(req, res) {
  const recordId = req.params.id;
  const existing = db.prepare('SELECT * FROM records WHERE id = ? AND is_deleted = 0').get(recordId);

  if (!existing) {
    return res.status(404).json({ error: 'Record not found' });
  }

  // merge existing with incoming — only update fields that are provided
  const amount = req.body.amount ?? existing.amount;
  const type = req.body.type ?? existing.type;
  const category = req.body.category ?? existing.category;
  const date = req.body.date ?? existing.date;
  const notes = req.body.notes !== undefined ? req.body.notes : existing.notes;

  db.prepare(
    'UPDATE records SET amount = ?, type = ?, category = ?, date = ?, notes = ? WHERE id = ?'
  ).run(amount, type, category, date, notes, recordId);

  res.json({ message: 'Record updated' });
}

// soft delete — marks as deleted instead of actually removing
function deleteRecord(req, res) {
  const record = db.prepare('SELECT id FROM records WHERE id = ? AND is_deleted = 0').get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  db.prepare('UPDATE records SET is_deleted = 1 WHERE id = ?').run(req.params.id);

  res.json({ message: 'Record deleted' });
}

// admin can restore soft-deleted records
function restoreRecord(req, res) {
  const record = db.prepare('SELECT id FROM records WHERE id = ? AND is_deleted = 1').get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: 'No deleted record found with that id' });
  }

  db.prepare('UPDATE records SET is_deleted = 0 WHERE id = ?').run(req.params.id);

  res.json({ message: 'Record restored' });
}

module.exports = { createRecord, getRecords, getRecordById, updateRecord, deleteRecord, restoreRecord };
