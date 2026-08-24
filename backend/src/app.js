const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const metricsCollector = require('./utils/metricsCollector');

// Routes
const eventRoutes = require('./routes/eventRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const alertRoutes = require('./routes/alertRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
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

// Performance Metrics
app.get('/api/metrics', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Live performance metrics',
    data: metricsCollector.getSnapshot()
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
