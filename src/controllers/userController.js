const User = require('../models/User');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, telegramId: user.telegramId },
    process.env.JWT_SECRET || 'alphawulfsecret',
    { expiresIn: '30d' }
  );
};

// Authenticate or create user from Telegram data
exports.authTelegram = async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, photoUrl } = req.body;
    
    if (!telegramId || !username || !firstName) {
      return res.status(400).json({ message: 'Missing required Telegram user data' });
    }
    
    // Find existing user or create new one
    let user = await User.findOne({ telegramId });
    
    if (!user) {
      // Create new user
      user = new User({
        telegramId,
        username,
        firstName,
        lastName: lastName || '',
        profilePhoto: photoUrl || '',
      });
      
      await user.save();
    } else {
      // Update user info if changed
      user.username = username;
      user.firstName = firstName;
      user.lastName = lastName || user.lastName;
      if (photoUrl) user.profilePhoto = photoUrl;
      
      await user.save();
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.status(200).json({
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        coins: user.coins,
        level: user.level,
        experience: user.experience,
        maxExperience: user.maxExperience,
        remainingTaps: user.remainingTaps,
        referralCode: user.referralCode
      }
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-__v')
      .populate('referredBy', 'username firstName lastName')
      .populate('referrals', 'username firstName lastName level createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// Process tap to earn coins
exports.processTap = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if taps should be reset (every 4 hours)
    const now = new Date();
    const fourHoursInMs = 4 * 60 * 60 * 1000;
    
    if (now - user.lastTapReset > fourHoursInMs) {
      user.remainingTaps = 100;
      user.lastTapReset = now;
    }
    
    // Check if user has remaining taps
    if (user.remainingTaps <= 0) {
      return res.status(400).json({ 
        message: 'No taps remaining. Please wait for reset.',
        nextReset: new Date(user.lastTapReset.getTime() + fourHoursInMs)
      });
    }
    
    // Process tap
    const coinsEarned = 5;
    user.coins += coinsEarned;
    user.remainingTaps -= 1;
    
    // Add experience
    user.experience += 1;
    
    // Check for level up
    if (user.experience >= user.maxExperience) {
      user.level += 1;
      user.experience = 0;
      user.maxExperience = Math.floor(user.maxExperience * 1.5); // Increase max experience for next level
    }
    
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      amount: coinsEarned,
      type: 'tap',
      description: 'Coins earned from tapping'
    });
    
    await transaction.save();
    
    res.status(200).json({
      coinsEarned,
      totalCoins: user.coins,
      remainingTaps: user.remainingTaps,
      level: user.level,
      experience: user.experience,
      maxExperience: user.maxExperience
    });
    
  } catch (error) {
    console.error('Tap error:', error);
    res.status(500).json({ message: 'Server error while processing tap' });
  }
};

// Process referral
exports.processReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    
    if (!referralCode) {
      return res.status(400).json({ message: 'Referral code is required' });
    }
    
    // Find user with this referral code
    const referrer = await User.findOne({ referralCode });
    
    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }
    
    // Get current user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is trying to refer themselves
    if (user.telegramId === referrer.telegramId) {
      return res.status(400).json({ message: 'You cannot refer yourself' });
    }
    
    // Check if user already has a referrer
    if (user.referredBy) {
      return res.status(400).json({ message: 'You already have a referrer' });
    }
    
    // Process referral
    user.referredBy = referrer._id;
    await user.save();
    
    // Add user to referrer's referrals
    referrer.referrals.push(user._id);
    
    // Award coins to referrer
    const referralBonus = 50;
    referrer.coins += referralBonus;
    await referrer.save();
    
    // Record transaction for referrer
    const transaction = new Transaction({
      user: referrer._id,
      amount: referralBonus,
      type: 'referral',
      description: `Referral bonus from ${user.username}`,
      reference: user._id,
      referenceModel: 'User'
    });
    
    await transaction.save();
    
    res.status(200).json({
      message: 'Referral processed successfully',
      referrer: {
        username: referrer.username,
        firstName: referrer.firstName
      }
    });
    
  } catch (error) {
    console.error('Referral error:', error);
    res.status(500).json({ message: 'Server error while processing referral' });
  }
};

// Get user's referrals
exports.getReferrals = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('referrals', 'username firstName lastName level createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate total earnings from referrals
    const totalEarnings = user.referrals.length * 50;
    
    res.status(200).json({
      referrals: user.referrals,
      totalEarnings,
      referralCode: user.referralCode
    });
    
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Server error while fetching referrals' });
  }
};
