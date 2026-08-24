/**
 * metricsCollector.js
 * Module-level singleton that tracks running performance stats.
 * Used by /api/metrics to expose live benchmark data.
 */

const metrics = {
  eventIngestion: {
    count: 0,
    totalLatencyMs: 0,
    avgLatencyMs: 0,
  },
  reconciliation: {
    count: 0,
    totalMs: 0,
    avgTotalMs: 0,
    avgMlInferenceMs: 0,
    avgDecisionMs: 0,
    avgDbWriteMs: 0,
    avgSocketEmitMs: 0,
    minTotalMs: Infinity,
    maxTotalMs: 0,
    _sumMl: 0,
    _sumDecision: 0,
    _sumDb: 0,
    _sumSocket: 0,
  },
  startedAt: new Date().toISOString(),
};

const recordIngestion = (latencyMs) => {
  metrics.eventIngestion.count++;
  metrics.eventIngestion.totalLatencyMs += latencyMs;
  metrics.eventIngestion.avgLatencyMs = parseFloat(
    (metrics.eventIngestion.totalLatencyMs / metrics.eventIngestion.count).toFixed(2)
  );
};

const recordReconciliation = (latencyBreakdown) => {
  const r = metrics.reconciliation;
  r.count++;
  r.totalMs += latencyBreakdown.total;
  r._sumMl += latencyBreakdown.mlInference;
  r._sumDecision += latencyBreakdown.decisionLogic;
  r._sumDb += latencyBreakdown.dbWrite;
  r._sumSocket += latencyBreakdown.socketEmit;

  r.avgTotalMs = parseFloat((r.totalMs / r.count).toFixed(2));
  r.avgMlInferenceMs = parseFloat((r._sumMl / r.count).toFixed(2));
  r.avgDecisionMs = parseFloat((r._sumDecision / r.count).toFixed(2));
  r.avgDbWriteMs = parseFloat((r._sumDb / r.count).toFixed(2));
  r.avgSocketEmitMs = parseFloat((r._sumSocket / r.count).toFixed(2));
  r.minTotalMs = parseFloat(Math.min(r.minTotalMs, latencyBreakdown.total).toFixed(2));
  r.maxTotalMs = parseFloat(Math.max(r.maxTotalMs, latencyBreakdown.total).toFixed(2));
};

const getSnapshot = () => {
  const r = metrics.reconciliation;
  return {
    uptime_seconds: parseFloat(process.uptime().toFixed(1)),
    startedAt: metrics.startedAt,
    eventIngestion: {
      count: metrics.eventIngestion.count,
      avgLatencyMs: metrics.eventIngestion.avgLatencyMs,
      estimatedHz: metrics.eventIngestion.count > 0
        ? parseFloat((metrics.eventIngestion.count / process.uptime()).toFixed(2))
        : 0,
    },
    reconciliation: {
      count: r.count,
      avgTotalMs: r.avgTotalMs,
      avgMlInferenceMs: r.avgMlInferenceMs,
      avgDecisionLogicMs: r.avgDecisionMs,
      avgDbWriteMs: r.avgDbWriteMs,
      avgSocketEmitMs: r.avgSocketEmitMs,
      minTotalMs: r.minTotalMs === Infinity ? null : r.minTotalMs,
      maxTotalMs: r.maxTotalMs,
    },
    slaCompliance: {
      target_hz: 10,
      target_response_ms: 500,
      target_ml_ms: 200,
      hz_met: metrics.eventIngestion.count > 0
        ? (metrics.eventIngestion.count / process.uptime()) >= 10
        : false,
      response_met: r.avgTotalMs > 0 ? r.avgTotalMs < 500 : null,
      ml_met: r.avgMlInferenceMs > 0 ? r.avgMlInferenceMs < 200 : null,
    }
  };
};

module.exports = { recordIngestion, recordReconciliation, getSnapshot };
