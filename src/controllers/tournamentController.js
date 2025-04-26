const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Get active tournament
exports.getActiveTournament = async (req, res) => {
  try {
    // Get the most recent tournament that is either scheduled or active
    const tournament = await Tournament.findOne({
      status: { $in: ['scheduled', 'active'] }
    }).sort({ startDate: 1 });
    
    if (!tournament) {
      return res.status(404).json({ message: 'No active tournament found' });
    }
    
    // Check if user is registered
    const user = await User.findById(req.user.id);
    let isRegistered = false;
    
    if (user) {
      isRegistered = tournament.participants.some(
        participant => participant.user.toString() === user._id.toString()
      );
    }
    
    res.status(200).json({
      tournament,
      isRegistered
    });
    
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ message: 'Server error while fetching tournament' });
  }
};

// Register for tournament
exports.registerForTournament = async (req, res) => {
  try {
    const { tournamentId } = req.body;
    
    if (!tournamentId) {
      return res.status(400).json({ message: 'Tournament ID is required' });
    }
    
    // Find the tournament
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    if (tournament.status !== 'scheduled') {
      return res.status(400).json({ message: 'Tournament registration is closed' });
    }
    
    // Get current user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already registered
    const isRegistered = tournament.participants.some(
      participant => participant.user.toString() === user._id.toString()
    );
    
    if (isRegistered) {
      return res.status(400).json({ message: 'You are already registered for this tournament' });
    }
    
    // Check if user has enough coins for entry fee
    if (user.coins < tournament.entryFee) {
      return res.status(400).json({ 
        message: 'Insufficient coins for tournament entry',
        required: tournament.entryFee,
        available: user.coins
      });
    }
    
    // Register user for tournament
    tournament.participants.push({
      user: user._id,
      score: 0,
      joined: new Date()
    });
    
    await tournament.save();
    
    // Deduct entry fee
    user.coins -= tournament.entryFee;
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      amount: -tournament.entryFee,
      type: 'tournament',
      description: `Tournament entry fee: ${tournament.name}`,
      reference: tournament._id,
      referenceModel: 'Tournament'
    });
    
    await transaction.save();
    
    res.status(200).json({
      message: 'Successfully registered for tournament',
      tournament: {
        name: tournament.name,
        startDate: tournament.startDate,
        prizePool: tournament.prizePool
      },
      remainingCoins: user.coins
    });
    
  } catch (error) {
    console.error('Tournament registration error:', error);
    res.status(500).json({ message: 'Server error while registering for tournament' });
  }
};

// Submit tournament score
exports.submitTournamentScore = async (req, res) => {
  try {
    const { tournamentId, score } = req.body;
    
    if (!tournamentId || score === undefined) {
      return res.status(400).json({ message: 'Tournament ID and score are required' });
    }
    
    // Find the tournament
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    if (tournament.status !== 'active') {
      return res.status(400).json({ message: 'Tournament is not active' });
    }
    
    // Get current user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is registered
    const participantIndex = tournament.participants.findIndex(
      participant => participant.user.toString() === user._id.toString()
    );
    
    if (participantIndex === -1) {
      return res.status(400).json({ message: 'You are not registered for this tournament' });
    }
    
    // Update user's score
    tournament.participants[participantIndex].score = score;
    await tournament.save();
    
    res.status(200).json({
      message: 'Tournament score submitted successfully',
      score
    });
    
  } catch (error) {
    console.error('Submit tournament score error:', error);
    res.status(500).json({ message: 'Server error while submitting tournament score' });
  }
};

// Get tournament results
exports.getTournamentResults = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    if (!tournamentId) {
      return res.status(400).json({ message: 'Tournament ID is required' });
    }
    
    // Find the tournament
    const tournament = await Tournament.findById(tournamentId)
      .populate('participants.user', 'username firstName lastName');
    
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    // Sort participants by score (descending)
    const sortedParticipants = [...tournament.participants].sort((a, b) => b.score - a.score);
    
    res.status(200).json({
      tournament: {
        name: tournament.name,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        prizePool: tournament.prizePool
      },
      results: sortedParticipants
    });
    
  } catch (error) {
    console.error('Get tournament results error:', error);
    res.status(500).json({ message: 'Server error while fetching tournament results' });
  }
};
