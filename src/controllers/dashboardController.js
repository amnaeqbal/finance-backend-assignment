const { db } = require('../models/db');

function getSummary(req, res) {
  const income = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM records WHERE type = 'income' AND is_deleted = 0"
  ).get().total;

  const expenses = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM records WHERE type = 'expense' AND is_deleted = 0"
  ).get().total;

  res.json({
    totalIncome: income,
    totalExpenses: expenses,
    netBalance: income - expenses,
  });
}

function getCategoryBreakdown(req, res) {
  const breakdown = db.prepare(`
    SELECT category, type,
           SUM(amount) as total,
           COUNT(*) as count
    FROM records
    WHERE is_deleted = 0
    GROUP BY category, type
    ORDER BY total DESC
  `).all();

  res.json({ breakdown });
}

function getRecentTransactions(req, res) {
  const limit = parseInt(req.query.limit) || 10;

  // cap at 50 to avoid someone requesting everything
  const safeLimit = Math.min(limit, 50);

  const transactions = db.prepare(
    'SELECT * FROM records WHERE is_deleted = 0 ORDER BY date DESC, created_at DESC LIMIT ?'
  ).all(safeLimit);

  res.json({ transactions });
}

function getMonthlySummary(req, res) {
  // group by year-month, split into income and expense
  // strftime is sqlite's way of formatting dates
  const monthly = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM records
    WHERE is_deleted = 0
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month DESC
    LIMIT 12
  `).all();

  // add net for each month — could do this in SQL but it's clearer here
  const result = monthly.map(row => ({
    ...row,
    net: row.income - row.expenses,
  }));

  res.json({ monthly: result });
}

module.exports = { getSummary, getCategoryBreakdown, getRecentTransactions, getMonthlySummary };
