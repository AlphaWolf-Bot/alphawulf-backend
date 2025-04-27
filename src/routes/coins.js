const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get user's coin balance
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ coins: user.coins });
  } catch (err) {
    console.error('Error getting coin balance:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's coin transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ transactions });
  } catch (err) {
    console.error('Error getting transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Process tap to earn coins
router.post('/tap', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if taps need to be reset (4 hour cooldown)
    const now = new Date();
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    
    if (now - user.lastTapReset > fourHoursInMs) {
      user.remainingTaps = 100;
      user.lastTapReset = now;
    }
    
    // Check if user has remaining taps
    if (user.remainingTaps <= 0) {
      return res.status(400).json({ 
        message: 'No taps remaining. Please wait for the cooldown to end.',
        nextReset: new Date(user.lastTapReset.getTime() + fourHoursInMs)
      });
    }
    
    // Process tap
    const coinsPerTap = 5;
    user.coins += coinsPerTap;
    user.remainingTaps -= 1;
    
    // Add experience for leveling up
    user.experience += 1;
    
    // Check if user leveled up
    if (user.experience >= user.maxExperience) {
      user.level += 1;
      user.experience = 0;
      user.maxExperience = Math.floor(user.maxExperience * 1.5); // Increase experience needed for next level
    }
    
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      amount: coinsPerTap,
      type: 'tap',
      description: 'Earned coins from tapping'
    });
    
    await transaction.save();
    
    res.json({
      coinsEarned: coinsPerTap,
      totalCoins: user.coins,
      remainingTaps: user.remainingTaps,
      level: user.level,
      experience: user.experience,
      maxExperience: user.maxExperience
    });
  } catch (err) {
    console.error('Error processing tap:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tap status (remaining taps and cooldown)
router.get('/tap-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if taps need to be reset (4 hour cooldown)
    const now = new Date();
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    
    if (now - user.lastTapReset > fourHoursInMs) {
      user.remainingTaps = 100;
      user.lastTapReset = now;
      await user.save();
    }
    
    // Calculate time until next reset
    const nextReset = new Date(user.lastTapReset.getTime() + fourHoursInMs);
    const timeUntilReset = Math.max(0, nextReset - now);
    
    res.json({
      remainingTaps: user.remainingTaps,
      nextReset,
      timeUntilReset,
      cooldownActive: user.remainingTaps <= 0
    });
  } catch (err) {
    console.error('Error getting tap status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
