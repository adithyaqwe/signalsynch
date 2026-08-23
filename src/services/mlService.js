const axios = require('axios');
const logger = require('../utils/logger');

const analyzeWithML = async (eventGroup) => {
  if (process.env.USE_MOCK_ML !== 'true' && process.env.ML_SERVICE_URL) {
    try {
      const response = await axios.post(process.env.ML_SERVICE_URL, eventGroup);
      return response.data;
    } catch (error) {
      logger.error('Error calling real ML service, falling back to Mock ML', { error: error.message });
      // Fallback to mock analysis on failure
    }
  }
  return mockAnalysis(eventGroup);
};

const mockAnalysis = (eventGroup) => {
  if (!eventGroup || eventGroup.length === 0) {
    return { status: 'unknown', confidence: 0, anomalyScore: 0, reason: 'No data' };
  }
  if (eventGroup.length === 1) {
    return { status: 'consistent', confidence: 1.0, anomalyScore: 0, reason: 'Single value' };
  }

  // Extract values
  const values = eventGroup.map(e => e.value);
  values.sort((a, b) => a - b);

  // Calculate median
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2.0;

  // Calculate deviations from median
  const deviations = eventGroup.map(e => ({
    source: e.source,
    value: e.value,
    dev: Math.abs(e.value - median)
  }));

  // Simple tolerance logic (e.g. 5% of median or fixed small value)
  const tolerance = Math.max(median * 0.05, 1.0); 

  const outliers = deviations.filter(d => d.dev > tolerance);

  if (outliers.length === 0) {
    return {
      status: 'consistent',
      confidence: 0.96,
      anomalyScore: 0.04,
      reason: 'All source values are within the acceptable deviation range'
    };
  }

  // We have outliers
  const conflictingSources = outliers.map(o => o.source);
  return {
    status: 'conflicting',
    confidence: 0.94,
    anomalyScore: 0.87,
    reason: `One or more values significantly deviate from the consensus`,
    conflictingSources
  };
};

module.exports = { analyzeWithML };
