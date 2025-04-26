const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import controllers
const userController = require('../controllers/userController');

// Get user profile
router.get('/profile', auth, userController.getProfile);

// Process tap to earn coins
router.post('/tap', auth, userController.processTap);

// Process referral
router.post('/referral', auth, userController.processReferral);

// Get user's referrals
router.get('/referrals', auth, userController.getReferrals);

module.exports = router;
