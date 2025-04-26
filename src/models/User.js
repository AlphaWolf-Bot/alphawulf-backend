const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String
  },
  profilePhoto: {
    type: String
  },
  coins: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  maxExperience: {
    type: Number,
    default: 100
  },
  remainingTaps: {
    type: Number,
    default: 100
  },
  lastTapReset: {
    type: Date,
    default: Date.now
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  referrals: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  completedTasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate a unique referral code before saving
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    // Generate a random alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ALPHA';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.referralCode = code;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
