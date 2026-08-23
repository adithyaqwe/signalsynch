// ============================================================
// SignalSynch — Mock Data Layer
// ============================================================
// This module provides realistic simulated data matching the
// backend's SSE reconciliation event schema. Toggle USE_MOCK
// to switch between mock data and live backend.
// ============================================================

// ── Configuration ──────────────────────────────────────────────
export const USE_MOCK = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_MOCK !== undefined)
  ? String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true'
  : false;

export const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL)
  ? String(import.meta.env.VITE_BACKEND_URL).replace(/\/+$/, '')
  : 'https://signalsynch-x7r4.onrender.com';
export const SSE_URL = `${BACKEND_URL}/stream`;
export const POLL_URL = `${BACKEND_URL}/api/reconciliation`;
export const AUDIT_URL = `${BACKEND_URL}/api/reconciliation`;
export const HEALTH_URL = `${BACKEND_URL}/api/health`;

// ── Sensor Config ──────────────────────────────────────────────
export const SENSORS = ['sensor_001', 'sensor_002', 'sensor_003', 'sensor_004', 'sensor_005', 'sensor_006', 'sensor_007', 'sensor_008', 'sensor_009', 'sensor_010'];
export const SOURCES = ['A', 'B', 'C'];
export const SOURCE_COLORS = {
  A: '#3b82f6', // blue
  B: '#a855f7', // purple
  C: '#06b6d4', // cyan
};

export const SOURCE_IDENTITIES = {
  A: 'Legacy API',
  B: 'Kafka Stream',
  C: 'IoT Edge',
};

export const SENSOR_BASELINES = {
  sensor_001: { base: 42.0, unit: 'celsius', label: 'Reactor Core Temp', range: 15 },
  sensor_002: { base: 101.3, unit: 'kPa', label: 'Pressure Vessel A', range: 20 },
  sensor_003: { base: 7.2, unit: 'pH', label: 'Coolant pH Level', range: 4 },
  sensor_004: { base: 1450, unit: 'RPM', label: 'Turbine Speed', range: 200 },
  sensor_005: { base: 220.0, unit: 'volts', label: 'Grid Voltage', range: 40 },
  sensor_006: { base: 55.5, unit: 'celsius', label: 'Cooling Intake Temp', range: 15 },
  sensor_007: { base: 300.0, unit: 'psi', label: 'Main Valve Pressure', range: 50 },
  sensor_008: { base: 12.4, unit: 'gal/s', label: 'Flow Rate Sensor', range: 5 },
  sensor_009: { base: 88.8, unit: 'kW', label: 'Generator Output', range: 20 },
  sensor_010: { base: 1000.0, unit: 'RPM', label: 'Secondary Turbine', range: 150 },
};

// ── Helpers ─────────────────────────────────────────────────────
let forceNextAnomaly = false;
export const triggerAnomaly = () => { forceNextAnomaly = true; };

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function gaussianNoise(sigma = 0.5) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function formatTimestamp(date) {
  return date.toISOString();
}

// ── Generate a single reconciliation event ──────────────────────
export function generateMockEvent(sensorId) {
  const config = SENSOR_BASELINES[sensorId];
  const now = new Date();

  // Source A and B: small noise around baseline
  const valA = parseFloat((config.base + gaussianNoise(0.5)).toFixed(2));
  const valB = parseFloat((config.base + gaussianNoise(0.5)).toFixed(2));

  // Source C: 20% chance of a conflict (large spike) OR forced via demo button
  const isConflict = forceNextAnomaly || Math.random() < 0.2;
  if (forceNextAnomaly) forceNextAnomaly = false; // reset after triggering
  const spike = isConflict ? (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 5) : 0;
  const valC = parseFloat((config.base + gaussianNoise(0.5) + spike).toFixed(2));

  const values = [valA, valB, valC];
  const mean = values.reduce((a, b) => a + b, 0) / 3;
  const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / 3);

  // Determine ML classification
  const maxDev = Math.max(...values.map((v) => Math.abs(v - mean)));
  const mlLabel = isConflict ? 'conflicting' : 'consistent';
  const mlConfidence = isConflict
    ? parseFloat((0.82 + Math.random() * 0.15).toFixed(2))
    : parseFloat((0.90 + Math.random() * 0.09).toFixed(2));

  // Reconciliation logic
  let trustedValue, explanation;
  if (mlLabel === 'consistent') {
    trustedValue = parseFloat(values.sort((a, b) => a - b)[1].toFixed(2)); // median
    explanation = `Consensus: median of sources A(${valA}), B(${valB}), C(${valC}).`;
  } else {
    // Find outlier
    const deviations = { A: Math.abs(valA - mean), B: Math.abs(valB - mean), C: Math.abs(valC - mean) };
    const outlierSource = Object.entries(deviations).sort((a, b) => b[1] - a[1])[0][0];
    const remaining = values.filter((_, i) => ['A', 'B', 'C'][i] !== outlierSource);
    trustedValue = parseFloat(((remaining[0] + remaining[1]) / 2).toFixed(2));
    const devSigma = std > 0 ? (deviations[outlierSource] / std).toFixed(1) : '∞';
    explanation = `Source ${outlierSource} flagged as outlier (+${devSigma}σ). Trusted: median of remaining sources.`;
  }

  return {
    reconciliation_id: uuid(),
    sensor_id: sensorId,
    timestamp: formatTimestamp(now),
    source_values: { A: valA, B: valB, C: valC },
    trusted_value: trustedValue,
    ml_label: mlLabel,
    ml_confidence: mlConfidence,
    alert: mlLabel === 'conflicting',
    explanation,
  };
}

// ── Generate initial history (last 30 events per sensor) ────────
export function generateInitialHistory() {
  const history = {};
  for (const sensorId of SENSORS) {
    history[sensorId] = [];
    for (let i = 29; i >= 0; i--) {
      const event = generateMockEvent(sensorId);
      const pastDate = new Date(Date.now() - i * 2000);
      event.timestamp = formatTimestamp(pastDate);
      history[sensorId].push(event);
    }
  }
  return history;
}

// ── Generate mock audit log entries ─────────────────────────────
export function generateMockAuditLog(count = 100) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const sensorId = SENSORS[Math.floor(Math.random() * SENSORS.length)];
    const event = generateMockEvent(sensorId);
    const pastDate = new Date(Date.now() - i * 3000);
    event.timestamp = formatTimestamp(pastDate);
    records.push(event);
  }
  return records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ── Generate summary stats ──────────────────────────────────────
export function computeStats(events) {
  if (!events || events.length === 0) {
    return { total: 0, conflicts: 0, consistent: 0, conflictRate: 0, avgConfidence: 0 };
  }
  const conflicts = events.filter((e) => e.ml_label === 'conflicting').length;
  const consistent = events.length - conflicts;
  const avgConfidence = events.reduce((sum, e) => sum + e.ml_confidence, 0) / events.length;
  return {
    total: events.length,
    conflicts,
    consistent,
    conflictRate: parseFloat(((conflicts / events.length) * 100).toFixed(1)),
    avgConfidence: parseFloat((avgConfidence * 100).toFixed(1)),
  };
}
