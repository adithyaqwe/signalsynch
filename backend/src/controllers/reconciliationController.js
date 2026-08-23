const Reconciliation = require('../models/Reconciliation');
const Event = require('../models/Event');
const { runReconciliation } = require('../services/reconciliationService');

const getReconciliations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;
    
    const reconciliations = await Reconciliation.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
      
    res.status(200).json({
      success: true,
      message: 'Reconciliations fetched successfully',
      data: reconciliations
    });
  } catch (error) {
    next(error);
  }
};

const getReconciliation = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    const reconciliation = await Reconciliation.findOne({ eventId });
    
    if (!reconciliation) {
      res.status(404);
      throw new Error('Reconciliation not found');
    }
    
    res.status(200).json({
      success: true,
      message: 'Reconciliation fetched successfully',
      data: reconciliation
    });
  } catch (error) {
    next(error);
  }
};

const triggerReconciliation = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    const eventGroup = await Event.find({ eventId });
    if (!eventGroup || eventGroup.length < 2) {
      res.status(400);
      throw new Error('Not enough events to reconcile for this eventId');
    }
    
    const reconciliation = await runReconciliation(eventId, eventGroup);
    
    res.status(200).json({
      success: true,
      message: 'Reconciliation triggered successfully',
      data: reconciliation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReconciliations,
  getReconciliation,
  triggerReconciliation
};
