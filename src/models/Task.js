const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const taskSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['social', 'daily', 'special'],
    default: 'social'
  },
  platform: {
    type: String,
    enum: ['twitter', 'youtube', 'telegram', 'instagram', 'other'],
    required: function() { return this.type === 'social'; }
  },
  url: {
    type: String,
    required: function() { return this.type === 'social'; }
  },
  reward: {
    type: Number,
    required: true,
    default: 50
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', taskSchema);
