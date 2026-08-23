const mongoose = require('mongoose');

const reconciliationSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  sourceValues: [{
    source: String,
    value: Number
  }],
  trustedValue: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['CONSISTENT', 'AUTO_RESOLVED', 'CONFLICT_DETECTED', 'HUMAN_REVIEW_REQUIRED'],
    required: true
  },
  confidence: {
    type: Number,
    default: null
  },
  conflictingSources: [{
    type: String
  }],
  mlResult: {
    type: Object,
    default: null
  },
  reason: {
    type: String
  },
  requiresHumanReview: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reconciliation', reconciliationSchema);
