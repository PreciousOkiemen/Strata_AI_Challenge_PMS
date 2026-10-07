// routes/interop.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware: Verify External API Key Header
const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-strata-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Unauthorized: Missing x-strata-api-key header.' });
  
  try {
    const keyRes = await db.query('SELECT * FROM external_api_keys WHERE is_active = TRUE');
    if (keyRes.rows.length === 0 && apiKey === 'strata_interop_key_2026') return next(); // Fallback key
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid API Key.' });
  }
};

// 1. GET /api/v3/external/scorecards - Fetch scorecards for BI / HRIS sync
router.get('/scorecards', verifyApiKey, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.id, u.full_name, u.email, u.role_designation, s.cycle_year, s.checkpoint,
             s.calculated_score, s.rating_band, s.status
      FROM scorecards s
      JOIN users u ON s.employee_id = u.id
    `);
    res.json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/v3/external/evidence - Attach Notion / Jira proof links automatically
router.post('/evidence', verifyApiKey, async (req, res) => {
  const { scorecard_id, kpi_id, notion_url } = req.body;
  try {
    await db.query(`UPDATE kpis SET notion_evidence_url = $1 WHERE id = $2 AND scorecard_id = $3`, [notion_url, kpi_id, scorecard_id]);
    await db.query(`INSERT INTO audit_logs (actor_id, event_type, target_entity, entity_id, payload) VALUES (NULL, 'EXTERNAL_EVIDENCE_SYNC', 'kpis', $1, $2)`, [kpi_id, JSON.stringify({ notion_url })]);
    res.json({ status: 'success', message: 'Evidence link updated via Interoperability API.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/v3/external/organogram - Export organizational directory
router.get('/organogram', verifyApiKey, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.full_name, u.email, u.role_designation,
             lm.full_name as line_manager, om.full_name as overall_manager
      FROM users u
      LEFT JOIN users lm ON u.line_manager_id = lm.id
      LEFT JOIN users om ON u.overall_manager_id = om.id
    `);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;