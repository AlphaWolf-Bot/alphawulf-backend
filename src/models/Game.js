const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  minReward: {
    type: Number,
    required: true
  },
  maxReward: {
    type: Number,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  playCount: {
    type: Number,
    default: 0
  },
  totalCoinsAwarded: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', gameSchema);
