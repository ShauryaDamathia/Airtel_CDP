'use strict';

const pg = require('../db/postgres');

// Customers must have marketing_email consent to be placed in segments
const MARKETING_CONSENTED =
  `id IN (SELECT customer_id FROM consents WHERE purpose = 'marketing_email' AND granted = TRUE)`;

/**
 * Recompute membership for one segment by rule_type.
 * Deletes existing rows for the segment then re-inserts fresh matches.
 */
async function recomputeSegment(segmentId, ruleType) {
  await pg.query('DELETE FROM segment_members WHERE segment_id = $1', [segmentId]);

  const base = `
    INSERT INTO segment_members (segment_id, customer_id)
    SELECT $1, id FROM customers
    WHERE (is_merged IS NULL OR is_merged = FALSE)
      AND ${MARKETING_CONSENTED}`;

  if (ruleType === 'high_spenders') {
    await pg.query(base + ` AND total_spent > 30000`, [segmentId]);

  } else if (ruleType === 'active_users') {
    await pg.query(base + ` AND last_seen_at > NOW() - INTERVAL '7 days'`, [segmentId]);

  } else if (ruleType === 'inactive_users') {
    await pg.query(base + ` AND last_seen_at < NOW() - INTERVAL '30 days'`, [segmentId]);
  }
}

/**
 * Recompute ALL segments.
 * Runs asynchronously after events — errors are logged, never propagated.
 */
async function recomputeAllSegments() {
  try {
    const { rows } = await pg.query('SELECT id, rule_type FROM segments');
    for (const seg of rows) {
      await recomputeSegment(seg.id, seg.rule_type);
    }
  } catch (err) {
    console.warn('[segments] recomputeAllSegments failed:', err.message);
  }
}

module.exports = { recomputeSegment, recomputeAllSegments };
