const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    
    if (!amount || !upiId) {
      return res.status(400).json({ message: 'Amount and UPI ID are required' });
    }
    
    // Validate amount
    const withdrawalAmount = parseInt(amount, 10);
    
    if (isNaN(withdrawalAmount) || withdrawalAmount < 1000) {
      return res.status(400).json({ message: 'Minimum withdrawal amount is 1000 coins' });
    }
    
    // Get current user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has enough coins
    if (user.coins < withdrawalAmount) {
      return res.status(400).json({ 
        message: 'Insufficient coins for withdrawal',
        required: withdrawalAmount,
        available: user.coins
      });
    }
    
    // Create withdrawal request
    const withdrawal = new Withdrawal({
      user: user._id,
      amount: withdrawalAmount,
      upiId
    });
    
    await withdrawal.save();
    
    // Deduct coins from user
    user.coins -= withdrawalAmount;
    await user.save();
    
    // Record transaction
    const transaction = new Transaction({
      user: user._id,
      amount: -withdrawalAmount,
      type: 'withdrawal',
      description: 'Withdrawal request',
      reference: withdrawal._id,
      referenceModel: 'Withdrawal'
    });
    
    await transaction.save();
    
    res.status(200).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        amountInr: withdrawal.amountInr,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      },
      remainingCoins: user.coins
    });
    
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ message: 'Server error while processing withdrawal request' });
  }
};

// Get user's withdrawals
exports.getUserWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({ withdrawals });
    
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ message: 'Server error while fetching withdrawals' });
  }
};

// Admin: Get all pending withdrawals
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' })
      .populate('user', 'username firstName lastName telegramId')
      .sort({ createdAt: 1 });
    
    res.status(200).json({ withdrawals });
    
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({ message: 'Server error while fetching pending withdrawals' });
  }
};

// Admin: Process withdrawal
exports.processWithdrawal = async (req, res) => {
  try {
    const { withdrawalId, status, remarks } = req.body;
    
    if (!withdrawalId || !status) {
      return res.status(400).json({ message: 'Withdrawal ID and status are required' });
    }
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: 'Status must be either approved or rejected' });
    }
    
    // Find the withdrawal
    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'This withdrawal has already been processed' });
    }
    
    // Update withdrawal status
    withdrawal.status = status;
    withdrawal.processedBy = req.user.id;
    withdrawal.processedAt = new Date();
    
    if (remarks) {
      withdrawal.remarks = remarks;
    }
    
    await withdrawal.save();
    
    // If rejected, refund coins to user
    if (status === 'rejected') {
      const user = await User.findById(withdrawal.user);
      
      if (user) {
        user.coins += withdrawal.amount;
        await user.save();
        
        // Record refund transaction
        const transaction = new Transaction({
          user: user._id,
          amount: withdrawal.amount,
          type: 'admin',
          description: 'Withdrawal request rejected - coins refunded',
          reference: withdrawal._id,
          referenceModel: 'Withdrawal'
        });
        
        await transaction.save();
      }
    }
    
    res.status(200).json({
      message: `Withdrawal ${status} successfully`,
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        amountInr: withdrawal.amountInr,
        status: withdrawal.status,
        processedAt: withdrawal.processedAt
      }
    });
    
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ message: 'Server error while processing withdrawal' });
  }
};
