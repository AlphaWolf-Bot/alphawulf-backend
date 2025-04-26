const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import controllers
const tournamentController = require('../controllers/tournamentController');

// Get active tournament
router.get('/active', auth, tournamentController.getActiveTournament);

// Register for tournament
router.post('/register', auth, tournamentController.registerForTournament);

// Submit tournament score
router.post('/score', auth, tournamentController.submitTournamentScore);

// Get tournament results
router.get('/results/:tournamentId', auth, tournamentController.getTournamentResults);

module.exports = router;
