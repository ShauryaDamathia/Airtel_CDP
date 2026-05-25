'use strict';

const express = require('express');
const pg      = require('../db/postgres');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/matches/pending — list all pending fuzzy matches
 * Admin + Compliance only
 */
router.get('/pending', requireRole('compliance'), async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT pm.id, pm.incoming_identifier, pm.identifier_type,
             pm.matched_customer_id, pm.similarity_score, pm.status,
             pm.created_at, pm.reviewed_at,
             c.email    AS matched_email,
             c.first_name, c.last_name,
             c.phone    AS matched_phone,
             u.full_name AS reviewed_by_name
      FROM pending_matches pm
      LEFT JOIN customers c ON c.id = pm.matched_customer_id
      LEFT JOIN users     u ON u.id = pm.reviewed_by
      ORDER BY pm.created_at DESC
      LIMIT 200
    `);
    res.json({ matches: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('List pending matches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matches/:id/confirm — confirm a fuzzy match (no action needed — already merged)
 * Admin + Compliance only
 */
router.post('/:id/confirm', requireRole('compliance'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pg.query(
      `UPDATE pending_matches
       SET status = 'confirmed', reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Match not found or already reviewed' });
    res.json({ ok: true, match: result.rows[0] });
  } catch (err) {
    console.error('Confirm match error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matches/:id/reject — reject a fuzzy match
 * Marks the match as rejected so it can be reviewed and the event corrected manually.
 * Admin + Compliance only
 */
router.post('/:id/reject', requireRole('compliance'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pg.query(
      `UPDATE pending_matches
       SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Match not found or already reviewed' });
    res.json({ ok: true, match: result.rows[0] });
  } catch (err) {
    console.error('Reject match error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
