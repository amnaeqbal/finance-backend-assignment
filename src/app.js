const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./models/db');
const { PORT } = require('./utils/config');
const { rateLimiter } = require('./middleware/rateLimit');

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// serve the frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// init database tables
initDB();

// rate limit on auth routes — 20 requests per minute per IP
app.use('/api/auth', rateLimiter(20, 60 * 1000));

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/records', require('./routes/records'));
app.use('/api/dashboard', require('./routes/dashboard'));

// health check — nice to have for quick testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// global error handler — catches anything unexpected
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
