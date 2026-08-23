const Alert = require('../models/Alert');
const { getIO } = require('../socket');
const logger = require('../utils/logger');

const createAlert = async ({ eventId, message, severity = 'HIGH', type = 'DATA_CONFLICT' }) => {
  try {
    const alert = new Alert({
      eventId,
      message,
      severity,
      type,
      status: 'OPEN'
    });
    
    await alert.save();
    
    // Emit via socket
    try {
      getIO().emit('conflict-alert', alert);
    } catch (socketError) {
      logger.warn('Socket error while emitting conflict-alert', { error: socketError.message });
    }
    
    return alert;
  } catch (error) {
    logger.error('Failed to create alert', { error: error.message });
    throw error;
  }
};

const resolveAlert = async (alertId) => {
  try {
    const alert = await Alert.findById(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    await alert.save();
    
    try {
      getIO().emit('alert-resolved', alert);
    } catch (socketError) {
      logger.warn('Socket error while emitting alert-resolved', { error: socketError.message });
    }
    
    return alert;
  } catch (error) {
    logger.error('Failed to resolve alert', { error: error.message });
    throw error;
  }
};

const getAlerts = async (query = {}) => {
  return Alert.find(query).sort({ createdAt: -1 });
};

module.exports = {
  createAlert,
  resolveAlert,
  getAlerts
};
