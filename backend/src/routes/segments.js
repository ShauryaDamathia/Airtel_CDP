'use strict';

const express = require('express');
const pg      = require('../db/postgres');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Consent gate for marketing segments
const MARKETING_CONSENTED =
  `id IN (SELECT customer_id FROM consents WHERE purpose = 'marketing_email' AND granted = TRUE)`;

/**
 * Recompute membership for one segment.
 */
async function recomputeSegment(segmentId, ruleType) {
  await pg.query('DELETE FROM segment_members WHERE segment_id = $1', [segmentId]);

  if (ruleType === 'high_spenders') {
    await pg.query(
      `INSERT INTO segment_members (segment_id, customer_id)
       SELECT $1, id FROM customers
       WHERE total_spent > 30000
         AND (is_merged IS NULL OR is_merged = FALSE)
         AND ${MARKETING_CONSENTED}`,
      [segmentId]
    );
  } else if (ruleType === 'active_users') {
    await pg.query(
      `INSERT INTO segment_members (segment_id, customer_id)
       SELECT $1, id FROM customers
       WHERE last_seen_at > NOW() - INTERVAL '7 days'
         AND (is_merged IS NULL OR is_merged = FALSE)
         AND ${MARKETING_CONSENTED}`,
      [segmentId]
    );
  } else if (ruleType === 'inactive_users') {
    await pg.query(
      `INSERT INTO segment_members (segment_id, customer_id)
       SELECT $1, id FROM customers
       WHERE last_seen_at < NOW() - INTERVAL '30 days'
         AND (is_merged IS NULL OR is_merged = FALSE)
         AND ${MARKETING_CONSENTED}`,
      [segmentId]
    );
  }
}

/**
 * GET /api/segments
 */
router.get('/', async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT s.id, s.name, s.description, s.rule_type, s.created_at,
             COUNT(sm.customer_id) AS member_count
      FROM segments s
      LEFT JOIN segment_members sm ON sm.segment_id = s.id
      GROUP BY s.id
      ORDER BY s.id
    `);
    res.json({ segments: result.rows });
  } catch (err) {
    console.error('List segments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/segments/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid segment id' });

    const segmentRes = await pg.query('SELECT * FROM segments WHERE id = $1', [id]);
    if (!segmentRes.rows.length) return res.status(404).json({ error: 'Segment not found' });

    const membersRes = await pg.query(
      `SELECT c.id, c.email, c.first_name, c.last_name, c.city,
              c.lifecycle_stage, c.total_spent, c.last_seen_at, sm.added_at
       FROM segment_members sm
       JOIN customers c ON c.id = sm.customer_id
       WHERE sm.segment_id = $1
       ORDER BY sm.added_at DESC
       LIMIT 100`,
      [id]
    );

    res.json({
      segment: segmentRes.rows[0],
      members: membersRes.rows,
      count:   membersRes.rows.length
    });
  } catch (err) {
    console.error('Get segment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/segments/:id/recompute — Admin, Marketer, Analyst (NOT compliance)
 */
router.post('/:id/recompute', requireRole('marketer', 'analyst'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const segmentRes = await pg.query('SELECT rule_type FROM segments WHERE id = $1', [id]);
    if (!segmentRes.rows.length) return res.status(404).json({ error: 'Segment not found' });

    await recomputeSegment(id, segmentRes.rows[0].rule_type);

    const countRes = await pg.query(
      'SELECT COUNT(*) AS count FROM segment_members WHERE segment_id = $1', [id]
    );
    res.json({ ok: true, member_count: parseInt(countRes.rows[0].count) });
  } catch (err) {
    console.error('Recompute segment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
