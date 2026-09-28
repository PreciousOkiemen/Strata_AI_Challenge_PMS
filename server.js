const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve Phase 1 Frontend Statically from /public
app.use(express.static(path.join(__dirname, 'public')));

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Strata Performance Management System',
    env: process.env.NODE_ENV || 'development'
  });
});

// Fallback to index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start local server only when running directly.
// Vercel imports the Express app instead.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;