const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { validateUser } = require('../middleware/validate');

// POST /api/auth/register — create a new account
router.post('/register', validateUser, register);

// POST /api/auth/login — get a JWT token
router.post('/login', login);

module.exports = router;
