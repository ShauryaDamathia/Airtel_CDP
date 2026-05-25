'use strict';

const express = require('express');
const pg      = require('../db/postgres');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_PURPOSES = [
  'analytics', 'marketing', 'marketing_email', 'marketing_sms',
  'personalization', 'third_party_sharing', 'data_retention'
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consents — all current consent records
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT c.id, c.customer_id, c.purpose, c.granted, c.updated_at,
             cu.email, cu.first_name, cu.last_name
      FROM consents c
      JOIN customers cu ON cu.id = c.customer_id
      WHERE (cu.is_merged IS NULL OR cu.is_merged = FALSE)
      ORDER BY cu.last_name, cu.first_name, c.purpose
      LIMIT 500
    `);
    res.json({ consents: result.rows });
  } catch (err) {
    console.error('List consents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consents/analytics — aggregate consent statistics
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', requireRole('compliance'), async (req, res) => {
  try {
    // Grant rates by purpose
    const ratesRes = await pg.query(`
      SELECT purpose,
             COUNT(*) AS total,
             SUM(CASE WHEN granted THEN 1 ELSE 0 END) AS granted_count,
             ROUND(100.0 * SUM(CASE WHEN granted THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS grant_rate
      FROM consents
      WHERE purpose != 'marketing'
      GROUP BY purpose
      ORDER BY purpose
    `);

    // Total customers for percentage base
    const custRes = await pg.query(
      `SELECT COUNT(*) AS c FROM customers WHERE is_merged IS NULL OR is_merged = FALSE`
    );
    const totalCustomers = parseInt(custRes.rows[0].c);

    // Consent grant/revoke trend (last 30 days, by day)
    const trendRes = await pg.query(`
      SELECT TO_CHAR(recorded_at, 'YYYY-MM-DD') AS day,
             SUM(CASE WHEN granted THEN 1 ELSE 0 END) AS granted,
             SUM(CASE WHEN NOT granted THEN 1 ELSE 0 END) AS revoked
      FROM consent_history
      WHERE recorded_at > NOW() - INTERVAL '30 days'
        AND purpose != 'marketing'
      GROUP BY day
      ORDER BY day
    `);

    // Withdrawn consent customers (at risk)
    const withdrawnRes = await pg.query(`
      SELECT COUNT(DISTINCT customer_id) AS c FROM consents
      WHERE purpose = 'analytics' AND granted = FALSE
    `);

    res.json({
      total_customers:   totalCustomers,
      rates:             ratesRes.rows,
      trend:             trendRes.rows,
      withdrawn_analytics: parseInt(withdrawnRes.rows[0].c)
    });
  } catch (err) {
    console.error('Consent analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consents/history — full audit log (admin/compliance)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/history', requireRole('compliance'), async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const purpose = req.query.purpose || null;
    const since   = req.query.since   || null;

    const conditions = ["(cu.is_merged IS NULL OR cu.is_merged = FALSE)"];
    const params     = [];
    let   idx        = 1;

    if (purpose) { conditions.push(`ch.purpose = $${idx++}`); params.push(purpose); }
    if (since)   { conditions.push(`ch.recorded_at >= $${idx++}`); params.push(since); }

    params.push(limit, offset);

    const result = await pg.query(
      `SELECT ch.id, ch.customer_id, ch.purpose, ch.granted,
              ch.legal_basis, ch.source, ch.channel, ch.policy_version,
              ch.notes, ch.recorded_at,
              cu.email, cu.first_name, cu.last_name,
              u.full_name AS recorded_by_name
       FROM consent_history ch
       JOIN customers cu ON cu.id = ch.customer_id
       LEFT JOIN users u ON u.id = ch.recorded_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY ch.recorded_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ history: result.rows, limit, offset });
  } catch (err) {
    console.error('Consent history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consents/customer/:id — consents for one customer
// ─────────────────────────────────────────────────────────────────────────────

router.get('/customer/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pg.query(
      'SELECT purpose, granted, updated_at FROM consents WHERE customer_id = $1 ORDER BY purpose',
      [id]
    );
    res.json({ consents: result.rows });
  } catch (err) {
    console.error('Get consents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/consents/customer/:id/history — full history for one customer
// ─────────────────────────────────────────────────────────────────────────────

router.get('/customer/:id/history', requireRole('compliance'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pg.query(
      `SELECT ch.id, ch.purpose, ch.granted, ch.legal_basis, ch.source,
              ch.channel, ch.policy_version, ch.notes, ch.recorded_at,
              u.full_name AS recorded_by_name
       FROM consent_history ch
       LEFT JOIN users u ON u.id = ch.recorded_by
       WHERE ch.customer_id = $1
       ORDER BY ch.recorded_at DESC
       LIMIT 200`,
      [id]
    );
    res.json({ history: result.rows });
  } catch (err) {
    console.error('Customer consent history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/consents — upsert consent + append to history (admin/compliance)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', requireRole('compliance'), async (req, res) => {
  try {
    const {
      customer_id, purpose, granted,
      source         = 'admin_override',
      channel        = 'web',
      policy_version = null,
      legal_basis    = 'consent',
      notes          = null
    } = req.body;

    if (!customer_id || !purpose || granted === undefined) {
      return res.status(400).json({ error: 'customer_id, purpose, granted required' });
    }
    if (!VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({ error: `purpose must be one of: ${VALID_PURPOSES.join(', ')}` });
    }

    // Upsert current consent record
    const consentRes = await pg.query(
      `INSERT INTO consents (customer_id, purpose, granted, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (customer_id, purpose)
       DO UPDATE SET granted = EXCLUDED.granted, updated_at = NOW()
       RETURNING *`,
      [customer_id, purpose, granted]
    );

    // Append to history (always insert, never update)
    const historyRes = await pg.query(
      `INSERT INTO consent_history
         (customer_id, purpose, granted, legal_basis, source, channel, policy_version, recorded_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [customer_id, purpose, granted, legal_basis, source, channel,
       policy_version, req.user.id, notes]
    );

    res.json({ ok: true, consent: consentRes.rows[0], history_entry: historyRes.rows[0] });
  } catch (err) {
    console.error('Update consent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
