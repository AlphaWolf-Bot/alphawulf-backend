const express = require('express');
const router = express.Router();
const { authenticateWebApp } = require('../telegram/bot');

// Import controllers
const userController = require('../controllers/userController');

// WebApp authentication route
router.post('/auth/webapp', authenticateWebApp, (req, res) => {
  res.status(200).json({
    token: req.token,
    user: {
      id: req.user._id,
      telegramId: req.user.telegramId,
      username: req.user.username,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      coins: req.user.coins,
      level: req.user.level,
      experience: req.user.experience,
      maxExperience: req.user.maxExperience,
      remainingTaps: req.user.remainingTaps,
      referralCode: req.user.referralCode
    }
  });
});

// Auth routes
router.post('/auth/telegram', userController.authTelegram);

module.exports = router;
