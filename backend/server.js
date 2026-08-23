const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/socket');
const connectDB = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to DB and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[Server] SignalSynch backend running on port ${PORT}`);
    // Automatically stream telemetry 24/7 in cloud
    try {
      const { startSimulator } = require('./simulator');
      startSimulator(PORT);
    } catch(e) {
      console.log('[Simulator] Auto-start error:', e.message);
    }
  });
}).catch(err => {
  console.error(`[Server] Failed to start server: ${err.message}`);
  process.exit(1);
});
