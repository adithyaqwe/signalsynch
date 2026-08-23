const alertService = require('../services/alertService');

const getAlerts = async (req, res, next) => {
  try {
    const alerts = await alertService.getAlerts(req.query);
    
    res.status(200).json({
      success: true,
      message: 'Alerts fetched successfully',
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

const resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const alert = await alertService.resolveAlert(id);
    
    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  resolveAlert
};
