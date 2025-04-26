const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import controllers
const adminController = require('../controllers/adminController');
const withdrawalController = require('../controllers/withdrawalController');

// Admin login
router.post('/login', adminController.login);

// Create admin (superadmin only)
router.post('/create', auth, adminAuth, adminController.createAdmin);

// Get dashboard stats
router.get('/dashboard', auth, adminAuth, adminController.getDashboardStats);

// Get all users
router.get('/users', auth, adminAuth, adminController.getAllUsers);

// Update task
router.put('/tasks/:taskId', auth, adminAuth, adminController.updateTask);

// Create task
router.post('/tasks', auth, adminAuth, adminController.createTask);

// Update game
router.put('/games/:gameId', auth, adminAuth, adminController.updateGame);

// Create game
router.post('/games', auth, adminAuth, adminController.createGame);

// Create or update tournament
router.put('/tournaments/:tournamentId?', auth, adminAuth, adminController.updateTournament);

// Award coins to user
router.post('/award-coins', auth, adminAuth, adminController.awardCoins);

// Get pending withdrawals
router.get('/withdrawals/pending', auth, adminAuth, withdrawalController.getPendingWithdrawals);

// Process withdrawal
router.post('/withdrawals/process', auth, adminAuth, withdrawalController.processWithdrawal);

module.exports = router;
