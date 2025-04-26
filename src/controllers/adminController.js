const Admin = require('../models/Admin');
const User = require('../models/User');
const Task = require('../models/Task');
const Game = require('../models/Game');
const Tournament = require('../models/Tournament');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT token
const generateToken = (admin) => {
  return jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET || 'alphawulfsecret',
    { expiresIn: '7d' }
  );
};

// Admin login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Find admin by username
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Generate token
    const token = generateToken(admin);
    
    res.status(200).json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Create admin (superadmin only)
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Username, password, and email are required' });
    }
    
    // Check if requester is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmins can create new admins' });
    }
    
    // Check if username or email already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    // Create new admin
    const admin = new Admin({
      username,
      password,
      email,
      role: role || 'admin'
    });
    
    await admin.save();
    
    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error while creating admin' });
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get active users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = await Transaction.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Get pending withdrawals
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    
    // Get total coins distributed
    const coinsDistributed = await Transaction.aggregate([
      {
        $match: {
          amount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get recent activities
    const recentActivities = await Transaction.find()
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.status(200).json({
      stats: {
        totalUsers,
        activeToday,
        pendingWithdrawals,
        coinsDistributed: coinsDistributed.length > 0 ? coinsDistributed[0].total : 0
      },
      recentActivities
    });
    
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard stats' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { telegramId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('telegramId username firstName lastName coins level referralCode createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, reward, active, url } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Update task fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (reward) task.reward = reward;
    if (url) task.url = url;
    if (active !== undefined) task.active = active;
    
    await task.save();
    
    res.status(200).json({
      message: 'Task updated successfully',
      task
    });
    
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
};

// Create task
exports.createTask = async (req, res) => {
  try {
    const { title, description, type, platform, url, reward } = req.body;
    
    if (!title || !description || !reward) {
      return res.status(400).json({ message: 'Title, description, and reward are required' });
    }
    
    if (type === 'social' && (!platform || !url)) {
      return res.status(400).json({ message: 'Platform and URL are required for social tasks' });
    }
    
    // Create new task
    const task = new Task({
      title,
      description,
      type: type || 'social',
      platform,
      url,
      reward
    });
    
    await task.save();
    
    res.status(201).json({
      message: 'Task created successfully',
      task
    });
    
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
};

// Update game
exports.updateGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { name, description, minReward, maxReward, active } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ message: 'Game ID is required' });
    }
    
    // Find the game
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Update game fields
    if (name) game.name = name;
    if (description) game.description = description;
    if (minReward) game.minReward = minReward;
    if (maxReward) game.maxReward = maxReward;
    if (active !== undefined) game.active = active;
    
    await game.save();
    
    res.status(200).json({
      message: 'Game updated successfully',
      game
    });
    
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ message: 'Server error while updating game' });
  }
};

// Create game
exports.createGame = async (req, res) => {
  try {
    const { name, description, minReward, maxReward } = req.body;
    
    if (!name || !description || !minReward || !maxReward) {
      return res.status(400).json({ message: 'Name, description, minReward, and maxReward are required' });
    }
    
    // Create new game
    const game = new Game({
      name,
      description,
      minReward,
      maxReward
    });
    
    await game.save();
    
    res.status(201).json({
      message: 'Game created successfully',
      game
    });
    
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ message: 'Server error while creating game' });
  }
};

// Create or update tournament
exports.updateTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { name, description, dayOfWeek, startTime, durationHours, entryFee, prizePool, active } = req.body;
    
    let tournament;
    
    if (tournamentId) {
      // Update existing tournament
      tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
      
      // Update tournament fields
      if (name) tournament.name = name;
      if (description) tournament.description = description;
      if (dayOfWeek) tournament.dayOfWeek = dayOfWeek;
      if (startTime) tournament.startTime = startTime;
      if (durationHours) tournament.durationHours = durationHours;
      if (entryFee) tournament.entryFee = entryFee;
      if (prizePool) tournament.prizePool = prizePool;
      if (active !== undefined) tournament.active = active;
    } else {
      // Create new tournament
      if (!name || !prizePool || !entryFee) {
        return res.status(400).json({ message: 'Name, prizePool, and entryFee are required' });
      }
      
      tournament = new Tournament({
        name,
        description,
        dayOfWeek: dayOfWeek || 'Friday',
        startTime: startTime || '20:00',
        durationHours: durationHours || 2,
        entryFee,
        prizePool
      });
    }
    
    await tournament.save();
    
    res.status(tournamentId ? 200 : 201).json({
      message: tournamentId ? 'Tournament updated successfully' : 'Tournament created successfully',
      tournament
    });
    
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ message: 'Server error while updating tournament' });
  }
};

// Award coins to user
exports.awardCoins = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ message: 'User ID and amount are required' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Award coins
    user.coins += parseInt(amount);
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      amount,
      type: 'admin',
      description: reason || 'Admin awarded coins'
    });
    
    await transaction.save();
    
    res.status(200).json({
      message: 'Coins awarded successfully',
      user: {
        id: user._id,
        username: user.username,
        coins: user.coins
      }
    });
    
  } catch (error) {
    console.error('Award coins error:', error);
    res.status(500).json({ message: 'Server error while awarding coins' });
  }
};
