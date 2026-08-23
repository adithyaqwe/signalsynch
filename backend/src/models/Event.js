const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Ensure a single source doesn't have duplicate readings for the same event at the exact same timestamp
eventSchema.index({ eventId: 1, source: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('Event', eventSchema);
