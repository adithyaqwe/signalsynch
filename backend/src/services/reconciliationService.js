const Reconciliation = require('../models/Reconciliation');
const AuditLog = require('../models/AuditLog');
const alertService = require('./alertService');
const { analyzeWithML } = require('./mlService');
const { getIO } = require('../socket');
const logger = require('../utils/logger');
const metrics = require('../utils/metricsCollector');

const runReconciliation = async (eventId, eventGroup) => {
  if (!eventGroup || eventGroup.length === 0) {
    throw new Error('No events provided for reconciliation');
  }

  const t0 = process.hrtime.bigint();

  // 1. Run ML Analysis
  const tMlStart = process.hrtime.bigint();
  const mlResult = await analyzeWithML(eventGroup);
  const tMlEnd = process.hrtime.bigint();
  const mlLatencyMs = Number(tMlEnd - tMlStart) / 1e6;
  
  // Emit ML Result
  try {
    getIO().emit('ml-result', { eventId, mlResult });
  } catch(e) {}

  // 2. Perform Reconciliation Logic
  const sourceValues = eventGroup.map(e => ({ source: e.source, value: e.value }));
  let trustedValue = null;
  let status = 'HUMAN_REVIEW_REQUIRED';
  let requiresHumanReview = true;
  let conflictingSources = [];
  let reason = '';
  
  const values = eventGroup.map(e => e.value);
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2.0;

  if (mlResult.status === 'consistent') {
    trustedValue = median;
    status = 'CONSISTENT';
    requiresHumanReview = false;
    reason = 'All values are consistent and form a consensus.';
  } else if (mlResult.status === 'conflicting') {
    conflictingSources = mlResult.conflictingSources || [];
    
    const consistentEvents = eventGroup.filter(e => !conflictingSources.includes(e.source));
    
    if (mlResult.confidence < 0.70) {
      status = 'HUMAN_REVIEW_REQUIRED';
      requiresHumanReview = true;
      reason = 'Mock ML identified conflicts, but confidence is too low to auto-resolve.';
    } else if (consistentEvents.length >= 2) {
      // We have a consensus of at least 2
      const consValues = consistentEvents.map(e => e.value);
      consValues.sort((a, b) => a - b);
      const cMid = Math.floor(consValues.length / 2);
      trustedValue = consValues.length % 2 !== 0 ? consValues[cMid] : (consValues[cMid - 1] + consValues[cMid]) / 2.0;
      
      status = 'AUTO_RESOLVED';
      requiresHumanReview = false;
      
      const consSources = consistentEvents.map(e => e.source).join(' and ');
      const confSources = conflictingSources.join(', ');
      reason = `${confSources} was identified as an anomaly and ${consSources} formed a consistent consensus. The ML analysis classified the event as conflicting with ${Math.round(mlResult.confidence * 100)}% confidence.`;
    } else {
      // No clear consensus (e.g. 3 completely different values or just 2 values differing)
      status = 'HUMAN_REVIEW_REQUIRED';
      requiresHumanReview = true;
      reason = 'No clear consensus could be formed. Human review is required.';
    }
  }

  // Set to CONFLICT_DETECTED temporarily if it requires human review
  if (requiresHumanReview) {
      status = 'CONFLICT_DETECTED';
  }

  // 3. Save Reconciliation Record
  let reconciliation = await Reconciliation.findOne({ eventId });
  if (reconciliation) {
    reconciliation.sourceValues = sourceValues;
    reconciliation.trustedValue = trustedValue;
    reconciliation.status = status;
    reconciliation.confidence = mlResult.confidence;
    reconciliation.conflictingSources = conflictingSources;
    reconciliation.mlResult = mlResult;
    reconciliation.reason = reason;
    reconciliation.requiresHumanReview = requiresHumanReview;
  } else {
    reconciliation = new Reconciliation({
      eventId,
      sourceValues,
      trustedValue,
      status,
      confidence: mlResult.confidence,
      conflictingSources,
      mlResult,
      reason,
      requiresHumanReview
    });
  }
  
  const tSaveStart = process.hrtime.bigint();
  await reconciliation.save();
  const tSaveEnd = process.hrtime.bigint();
  const saveLatencyMs = Number(tSaveEnd - tSaveStart) / 1e6;

  // 4. Create Alert if needed
  if (status === 'CONFLICT_DETECTED' || requiresHumanReview) {
    await alertService.createAlert({
      eventId,
      message: `Conflicting readings detected. ${reason}`,
      severity: 'HIGH',
      type: 'DATA_CONFLICT'
    });
  }

  // 5. Save Audit Log
  const auditAction = status === 'CONSISTENT' ? 'EVENT_ANALYZED' :
                      status === 'AUTO_RESOLVED' ? 'AUTO_RESOLVED' :
                      'CONFLICT_DETECTED';
                      
  await AuditLog.create({
    eventId,
    action: auditAction,
    decision: status,
    trustedValue,
    reason,
    mlResult
  });

  // Measure total reconciliation latency
  const tSocketStart = process.hrtime.bigint();
  try {
    getIO().emit('reconciliation-result', reconciliation);
  } catch(e) {}
  const tSocketEnd = process.hrtime.bigint();
  const socketLatencyMs = Number(tSocketEnd - tSocketStart) / 1e6;

  const totalLatencyMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const decisionLatencyMs = totalLatencyMs - mlLatencyMs - saveLatencyMs - socketLatencyMs;

  const latencyMs = {
    mlInference: parseFloat(mlLatencyMs.toFixed(2)),
    decisionLogic: parseFloat(decisionLatencyMs.toFixed(2)),
    dbWrite: parseFloat(saveLatencyMs.toFixed(2)),
    socketEmit: parseFloat(socketLatencyMs.toFixed(2)),
    total: parseFloat(totalLatencyMs.toFixed(2))
  };

  reconciliation.latencyMs = latencyMs;
  metrics.recordReconciliation(latencyMs);
  logger.info(`[Perf] Reconciliation ${eventId} | ML: ${latencyMs.mlInference}ms | Decision: ${latencyMs.decisionLogic}ms | DB: ${latencyMs.dbWrite}ms | Socket: ${latencyMs.socketEmit}ms | TOTAL: ${latencyMs.total}ms`);

  return reconciliation;
};

module.exports = { runReconciliation };
