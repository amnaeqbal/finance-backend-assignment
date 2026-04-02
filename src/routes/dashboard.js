const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getSummary, getCategoryBreakdown, getRecentTransactions, getMonthlySummary
} = require('../controllers/dashboardController');

// all authenticated users can view dashboard data
// viewers and analysts both need this
router.use(authenticate, authorize('admin', 'analyst', 'viewer'));

router.get('/summary', getSummary);
router.get('/category-breakdown', getCategoryBreakdown);
router.get('/recent', getRecentTransactions);
router.get('/monthly', getMonthlySummary);

module.exports = router;
