const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Routes
const eventRoutes = require('./routes/eventRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const alertRoutes = require('./routes/alertRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root & Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'SignalSynch Real-Time Backend API',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SignalSynch backend is running',
    status: 'ok',
    model_loaded: true,
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/audit-logs', auditRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
