const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  decision: {
    type: String
  },
  trustedValue: {
    type: Number,
    default: null
  },
  reason: {
    type: String
  },
  mlResult: {
    type: Object
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
