'use strict';

const pg = require('../db/postgres');

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle stage thresholds
//
//  vip      – total_spent >= 30 000  (high-value customer)
//  active   – seen within 30 days  AND  total_events >= 5  (engaged, not vip)
//  dormant  – total_events >= 5  BUT  not seen in 30 days  (lapsed, not vip)
//  new      – everything else  (< 5 events or brand-new)
// ─────────────────────────────────────────────────────────────────────────────

const VIP_SPEND     = 30000;
const ACTIVE_DAYS   = 30;
const MIN_EVENTS    = 5;

/**
 * Recalculate and persist lifecycle_stage for a single customer.
 * Called after every event so the stage is always current.
 * Errors are swallowed — never block the event response.
 */
async function updateLifecycleStage(customerId) {
  try {
    await pg.query(
      `UPDATE customers
       SET lifecycle_stage = CASE
         WHEN total_spent  >= $2                                        THEN 'vip'
         WHEN total_events >= $3 AND last_seen_at > NOW() - ($4 || ' days')::interval THEN 'active'
         WHEN total_events >= $3 AND last_seen_at < NOW() - ($4 || ' days')::interval THEN 'dormant'
         ELSE 'new'
       END
       WHERE id = $1`,
      [customerId, VIP_SPEND, MIN_EVENTS, ACTIVE_DAYS]
    );
  } catch (err) {
    console.warn('[lifecycle] updateLifecycleStage failed:', err.message);
  }
}

/**
 * Recalculate lifecycle_stage for ALL non-merged customers.
 * Used on startup / manual trigger to fix any stale stages.
 */
async function updateAllLifecycleStages() {
  try {
    const res = await pg.query(
      `UPDATE customers
       SET lifecycle_stage = CASE
         WHEN total_spent  >= $1                                        THEN 'vip'
         WHEN total_events >= $2 AND last_seen_at > NOW() - ($3 || ' days')::interval THEN 'active'
         WHEN total_events >= $2 AND last_seen_at < NOW() - ($3 || ' days')::interval THEN 'dormant'
         ELSE 'new'
       END
       WHERE is_merged IS NULL OR is_merged = FALSE`,
      [VIP_SPEND, MIN_EVENTS, ACTIVE_DAYS]
    );
    console.log(`[lifecycle] Updated ${res.rowCount} customer stage(s).`);
  } catch (err) {
    console.warn('[lifecycle] updateAllLifecycleStages failed:', err.message);
  }
}

module.exports = { updateLifecycleStage, updateAllLifecycleStages };
