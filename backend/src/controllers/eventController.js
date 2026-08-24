const Event = require('../models/Event');
const { normalizeEvent } = require('../services/normalizationService');
const { runReconciliation } = require('../services/reconciliationService');
const { getIO } = require('../socket');
const logger = require('../utils/logger');
const metrics = require('../utils/metricsCollector');

const receiveEvent = async (req, res, next) => {
  const tIngest = process.hrtime.bigint();
  try {
    const payloads = Array.isArray(req.body) ? req.body : [req.body];
    const normalizedEvents = payloads.map(normalizeEvent);
    
    const savedEvents = [];
    const eventGroupIds = new Set();
    
    for (const data of normalizedEvents) {
      try {
        const event = new Event(data);
        await event.save();
        savedEvents.push(event);
        eventGroupIds.add(event.eventId);
        
        try {
          getIO().emit('new-event', event);
        } catch(e) {}
      } catch (err) {
        if (err.code === 11000) {
          logger.warn('Duplicate event ignored', { eventId: data.eventId, source: data.source });
        } else {
          throw err;
        }
      }
    }
    
    // Trigger reconciliation asynchronously for each affected event group
    for (const eventId of eventGroupIds) {
      // Find latest readings for this event group
      Event.find({ eventId }).sort({ timestamp: -1 }).limit(3).then(eventGroup => {
        if (eventGroup.length >= 2) {
            runReconciliation(eventId, eventGroup).catch(err => {
              logger.error('Background reconciliation failed', { eventId, error: err.message });
            });
        }
      });
    }

    const ingestLatencyMs = Number(process.hrtime.bigint() - tIngest) / 1e6;
    savedEvents.forEach(() => metrics.recordIngestion(ingestLatencyMs / savedEvents.length));

    res.status(201).json({
      success: true,
      message: 'Event processed successfully',
      data: savedEvents
    });
  } catch (error) {
    next(error);
  }
};

const getEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, eventId, source } = req.query;
    
    const query = {};
    if (eventId) query.eventId = eventId;
    if (source) query.source = source;
    
    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
      
    res.status(200).json({
      success: true,
      message: 'Events fetched successfully',
      data: events
    });
  } catch (error) {
    next(error);
  }
};

const getEventGroup = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    
    const events = await Event.find({ eventId }).sort({ timestamp: -1 });
    
    if (!events.length) {
      res.status(404);
      throw new Error('Event group not found');
    }
    
    res.status(200).json({
      success: true,
      message: 'Event group fetched successfully',
      data: events
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  receiveEvent,
  getEvents,
  getEventGroup
};
