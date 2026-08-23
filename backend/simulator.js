/**
 * SignalSynch — Telemetry Feed Simulator
 * Generates continuous multi-source sensor streams (Sources A, B, C)
 * matching the PRD specification with realistic noise and periodic anomaly spikes.
 */

const axios = require('axios');

const PORT = process.env.PORT || 5000;
const API_ENDPOINT = process.env.API_ENDPOINT || `http://127.0.0.1:${PORT}/api/events`;
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS, 10) || 1200;

const SENSOR_BASELINES = {
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

const SENSOR_KEYS = Object.keys(SENSOR_BASELINES);

function gaussianNoise(sigma = 0.5) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

let tickCount = 0;

async function sendTick(targetEndpoint) {
  const endpoint = targetEndpoint || API_ENDPOINT;
  const sensorId = SENSOR_KEYS[tickCount % SENSOR_KEYS.length];
  const config = SENSOR_BASELINES[sensorId];
  const now = new Date().toISOString();

  // Baseline signals for Sources A & B
  const valA = parseFloat((config.base + gaussianNoise(0.4)).toFixed(2));
  const valB = parseFloat((config.base + gaussianNoise(0.4)).toFixed(2));

  // Source C: 20% probability of anomaly spike (or every 5th tick)
  const isConflict = tickCount % 5 === 0 || Math.random() < 0.20;
  const spike = isConflict ? (Math.random() > 0.5 ? 1 : -1) * (6.0 + Math.random() * 5.0) : gaussianNoise(0.4);
  const valC = parseFloat((config.base + spike).toFixed(2));

  // Cycle through supported formats to prove backend normalization
  const formatVariant = tickCount % 3;
  let payload;

  if (formatVariant === 0) {
    // Format A standard
    payload = [
      { eventId: sensorId, source: 'SOURCE_A', value: valA, timestamp: now },
      { eventId: sensorId, source: 'SOURCE_B', value: valB, timestamp: now },
      { eventId: sensorId, source: 'SOURCE_C', value: valC, timestamp: now }
    ];
  } else if (formatVariant === 1) {
    // Format B variant
    payload = [
      { event_id: sensorId, source_id: 'SOURCE_A', reading: valA, time: now },
      { event_id: sensorId, source_id: 'SOURCE_B', reading: valB, time: now },
      { event_id: sensorId, source_id: 'SOURCE_C', reading: valC, time: now }
    ];
  } else {
    // Format C variant
    payload = [
      { id: sensorId, source: 'SOURCE_A', eventValue: valA, timestamp: now },
      { id: sensorId, source: 'SOURCE_B', eventValue: valB, timestamp: now },
      { id: sensorId, source: 'SOURCE_C', eventValue: valC, timestamp: now }
    ];
  }

  try {
    const res = await axios.post(endpoint, payload, { timeout: 3000 });
    const flag = isConflict ? '🚨 CONFLICT INJECTED' : '✅ CONSISTENT';
    console.log(`[Tick #${tickCount + 1}] ${sensorId} (${config.label}) | A: ${valA} | B: ${valB} | C: ${valC} ${config.unit} -> ${flag}`);
  } catch (err) {
    console.error(`[Simulator Error] Failed to post telemetry for ${sensorId}:`, err.message);
  }

  tickCount++;
}

function startSimulator(customPort) {
  const targetPort = customPort || process.env.PORT || 5000;
  const endpoint = process.env.API_ENDPOINT || `http://127.0.0.1:${targetPort}/api/events`;

  console.log('========================================================');
  console.log('📡 SignalSynch Telemetry Feed Simulator Started');
  console.log(`🎯 Target API: ${endpoint}`);
  console.log(`⏱  Interval: ${INTERVAL_MS}ms across ${SENSOR_KEYS.length} industrial sensors`);
  console.log('========================================================\n');

  // Initial delay then stream
  setTimeout(() => {
    sendTick(endpoint);
    setInterval(() => sendTick(endpoint), INTERVAL_MS);
  }, 2000);
}

if (require.main === module) {
  startSimulator();
}

module.exports = { startSimulator, SENSOR_BASELINES };
