const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { authMiddleware } = require('./auth');
const usersRouter = require('./routes/users');
const documentsRouter = require('./routes/documents');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ajaia-doc-editor', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/documents', authMiddleware, documentsRouter);

// Serve static frontend build if present (for single-command production runtime)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Fallback for SPA routing without path-to-regexp '*' compatibility issues
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal server error occurred.',
    details: err.message
  });
});

module.exports = app;
