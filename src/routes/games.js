const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import controllers
const gameController = require('../controllers/gameController');

// Get all active games
router.get('/', auth, gameController.getAllGames);

// Play a game and award coins
router.post('/play', auth, gameController.playGame);

module.exports = router;
