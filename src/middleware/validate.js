// hand-rolled validation instead of using joi or yup
// for this project size, a library feels like overkill

function validateRecord(req, res, next) {
  const { amount, type, category, date } = req.body;
  const errors = [];

  if (amount === undefined || amount === null) {
    errors.push('amount is required');
  } else if (typeof amount !== 'number' || amount <= 0) {
    errors.push('amount must be a positive number');
  }

  if (!type) {
    errors.push('type is required');
  } else if (!['income', 'expense'].includes(type)) {
    errors.push('type must be "income" or "expense"');
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('category is required');
  }

  if (!date) {
    errors.push('date is required');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('date must be in YYYY-MM-DD format');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

function validateUser(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('name must be at least 2 characters');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('valid email is required');
  }

  if (!password || password.length < 6) {
    errors.push('password must be at least 6 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  next();
}

module.exports = { validateRecord, validateUser };
