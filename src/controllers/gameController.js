const Game = require('../models/Game');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get all active games
exports.getAllGames = async (req, res) => {
  try {
    const games = await Game.find({ active: true });
    
    res.status(200).json({ games });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error while fetching games' });
  }
};

// Play a game and award coins
exports.playGame = async (req, res) => {
  try {
    const { gameId, score } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ message: 'Game ID is required' });
    }
    
    // Find the game
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    if (!game.active) {
      return res.status(400).json({ message: 'This game is no longer active' });
    }
    
    // Get current user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate reward based on score or random value between min and max
    let reward;
    if (score !== undefined) {
      // If score is provided, calculate reward based on score
      // This is a simple calculation, can be adjusted based on game mechanics
      const scorePercent = Math.min(100, Math.max(0, score)) / 100;
      reward = Math.floor(game.minReward + (game.maxReward - game.minReward) * scorePercent);
    } else {
      // Random reward between min and max
      reward = Math.floor(game.minReward + Math.random() * (game.maxReward - game.minReward + 1));
    }
    
    // Update user coins and experience
    user.coins += reward;
    user.experience += 3;
    
    // Check for level up
    if (user.experience >= user.maxExperience) {
      user.level += 1;
      user.experience = 0;
      user.maxExperience = Math.floor(user.maxExperience * 1.5); // Increase max experience for next level
    }
    
    await user.save();
    
    // Update game stats
    game.playCount += 1;
    game.totalCoinsAwarded += reward;
    await game.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      amount: reward,
      type: 'game',
      description: `Played game: ${game.name}`,
      reference: game._id,
      referenceModel: 'Game'
    });
    
    await transaction.save();
    
    res.status(200).json({
      message: 'Game completed successfully',
      coinsEarned: reward,
      totalCoins: user.coins,
      level: user.level,
      experience: user.experience,
      maxExperience: user.maxExperience
    });
    
  } catch (error) {
    console.error('Play game error:', error);
    res.status(500).json({ message: 'Server error while playing game' });
  }
};
