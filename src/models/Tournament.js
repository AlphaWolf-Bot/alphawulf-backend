const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tournamentSchema = new Schema({
  name: {
    type: String,
    required: true,
    default: 'ALPHA BATTLE'
  },
  description: {
    type: String,
    default: 'Weekly tournament where users can bet coins and compete to win the prize pool.'
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    default: 'Friday'
  },
  startTime: {
    type: String,
    default: '20:00' // 8:00 PM
  },
  durationHours: {
    type: Number,
    default: 2
  },
  entryFee: {
    type: Number,
    required: true,
    default: 100
  },
  prizePool: {
    type: Number,
    default: 10000
  },
  active: {
    type: Boolean,
    default: true
  },
  participants: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    score: {
      type: Number,
      default: 0
    },
    joined: {
      type: Date,
      default: Date.now
    }
  }],
  winners: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    position: {
      type: Number
    },
    reward: {
      type: Number
    }
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tournament', tournamentSchema);
