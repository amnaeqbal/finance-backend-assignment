const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllUsers, getUserById, updateUserRole, toggleUserStatus } = require('../controllers/userController');

// all user management routes need admin access
router.use(authenticate, authorize('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id/role', updateUserRole);
router.patch('/:id/status', toggleUserStatus);

module.exports = router;
