const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import controllers
const withdrawalController = require('../controllers/withdrawalController');

// Request withdrawal
router.post('/request', auth, withdrawalController.requestWithdrawal);

// Get user's withdrawals
router.get('/history', auth, withdrawalController.getUserWithdrawals);

module.exports = router;
