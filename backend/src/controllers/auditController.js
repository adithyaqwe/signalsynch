const AuditLog = require('../models/AuditLog');

const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, eventId } = req.query;
    
    const query = {};
    if (eventId) query.eventId = eventId;
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
      
    res.status(200).json({
      success: true,
      message: 'Audit logs fetched successfully',
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
