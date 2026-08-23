const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    default: 'DATA_CONFLICT'
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'RESOLVED'],
    default: 'OPEN'
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
