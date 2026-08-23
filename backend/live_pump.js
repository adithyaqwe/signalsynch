const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const SENSORS = ['sensor_001', 'sensor_002', 'sensor_003'];

function gaussianNoise(sigma = 0.5) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

async function pumpData() {
  console.log('--- Starting Live Data Pump ---');
  
  setInterval(async () => {
    try {
      const sensorId = SENSORS[Math.floor(Math.random() * SENSORS.length)];
      const base = 70;
      
      // 10% chance to generate a conflict (spike)
      const isConflict = Math.random() < 0.1;
      
      const payload = [
        {
          eventId: sensorId,
          source: 'SOURCE_A',
          value: parseFloat((base + gaussianNoise(0.5)).toFixed(2)),
          timestamp: new Date().toISOString()
        },
        {
          eventId: sensorId,
          source: 'SOURCE_B',
          value: parseFloat((base + gaussianNoise(0.5)).toFixed(2)),
          timestamp: new Date().toISOString()
        },
        {
          eventId: sensorId,
          source: 'SOURCE_C',
          value: parseFloat((base + gaussianNoise(0.5) + (isConflict ? 15 : 0)).toFixed(2)),
          timestamp: new Date().toISOString()
        }
      ];

      await axios.post(`${BACKEND_URL}/api/events`, payload);
      console.log(`[${new Date().toISOString()}] Sent event for ${sensorId} (Conflict: ${isConflict})`);
    } catch (error) {
      console.error('Error pumping data:', error.message);
    }
  }, 2000); // Send data every 2 seconds
}

pumpData();
