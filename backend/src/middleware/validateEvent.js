const validateEvent = (req, res, next) => {
  const payload = req.body;
  
  if (Array.isArray(payload)) {
      // Validate each item if array
      for (const item of payload) {
          if (!isValid(item)) {
            res.status(400);
            return next(new Error('Validation failed for one or more items in the array'));
          }
      }
  } else {
      if (!isValid(payload)) {
        res.status(400);
        return next(new Error('Validation failed for the event payload'));
      }
  }
  
  next();
};

const isValid = (payload) => {
    // Format A
    if (payload.eventId && payload.source && payload.value !== undefined && payload.timestamp) return true;
    // Format B
    if (payload.event_id && payload.source_id && payload.reading !== undefined && payload.time) return true;
    // Format C
    if (payload.id && payload.source && payload.eventValue !== undefined && payload.timestamp) return true;
    
    return false;
}

module.exports = validateEvent;
