// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const scorecardRoutes = require('./routes/scorecards');
const interopRoutes = require('./routes/interop'); // Interoperability API

const app = express();

app.use(cors());
app.use(express.json());

// Serve Static Frontend (Phase 3 UI)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/scorecards', scorecardRoutes);
app.use('/api/v3/external', interopRoutes); // Interoperability REST API

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'online', system: 'Strata Performance Management System', phase: 'Phase 3 Interoperable Production' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Strata PMS Phase 3 running on port ${PORT}`));


// At the bottom of server.js
module.exports = app;

// Only listen locally, not in Vercel serverless environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}