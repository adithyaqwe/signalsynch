const normalizeEvent = (payload) => {
  // Format A: { eventId, source, value, timestamp }
  if (payload.eventId && payload.source && payload.value !== undefined && payload.timestamp) {
    return {
      eventId: payload.eventId,
      source: payload.source,
      value: Number(payload.value),
      timestamp: new Date(payload.timestamp),
      metadata: payload.metadata || {}
    };
  }

  // Format B: { event_id, source_id, reading, time }
  if (payload.event_id && payload.source_id && payload.reading !== undefined && payload.time) {
    return {
      eventId: payload.event_id,
      source: payload.source_id,
      value: Number(payload.reading),
      timestamp: new Date(payload.time),
      metadata: payload.metadata || {}
    };
  }

  // Format C: { id, source, eventValue, timestamp }
  if (payload.id && payload.source && payload.eventValue !== undefined && payload.timestamp) {
    return {
      eventId: payload.id,
      source: payload.source,
      value: Number(payload.eventValue),
      timestamp: new Date(payload.timestamp),
      metadata: payload.metadata || {}
    };
  }

  throw new Error('Unsupported event format');
};

module.exports = { normalizeEvent };
