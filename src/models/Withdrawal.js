const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const withdrawalSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1000 // Minimum 1000 coins
  },
  amountInr: {
    type: Number,
    required: true
  },
  upiId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  remarks: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate INR amount before saving
withdrawalSchema.pre('save', function(next) {
  if (!this.amountInr) {
    // Conversion rate: 1000 coins = 10 INR
    this.amountInr = (this.amount / 1000) * 10;
  }
  next();
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
