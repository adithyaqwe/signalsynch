const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';

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

const SENSORS = Object.keys(SENSOR_BASELINES);

function gaussianNoise(sigma = 0.5) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

async function pumpData() {
  console.log('--- Starting Live Data Pump for ALL SENSORS ---');
  
  setInterval(async () => {
    try {
      const sensorId = SENSORS[Math.floor(Math.random() * SENSORS.length)];
      const config = SENSOR_BASELINES[sensorId];
      const base = config.base;
      const sigma = config.range * 0.05; // 5% noise factor based on range
      
      // 10% chance to generate a conflict (spike)
      const isConflict = Math.random() < 0.1;
      const spike = isConflict ? (config.range * 0.8) : 0; // Huge spike for anomaly
      
      const payload = [
        {
          eventId: sensorId,
          source: 'SOURCE_A',
          value: parseFloat((base + gaussianNoise(sigma)).toFixed(2)),
          timestamp: new Date().toISOString()
        },
        {
          eventId: sensorId,
          source: 'SOURCE_B',
          value: parseFloat((base + gaussianNoise(sigma)).toFixed(2)),
          timestamp: new Date().toISOString()
        },
        {
          eventId: sensorId,
          source: 'SOURCE_C',
          value: parseFloat((base + gaussianNoise(sigma) + spike).toFixed(2)),
          timestamp: new Date().toISOString()
        }
      ];

      await axios.post(`${BACKEND_URL}/api/events`, payload);
      console.log(`[${new Date().toISOString()}] Sent event for ${config.label} (${sensorId}) | Conflict: ${isConflict}`);
    } catch (error) {
      console.error('Error pumping data:', error.message);
    }
  }, 1000); // Send data every 1 second
}

pumpData();
