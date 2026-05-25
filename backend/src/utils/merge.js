'use strict';

const pg = require('../db/postgres');

/**
 * Merge multiple customer records into a single survivor.
 * Survivor = the oldest customer by created_at (preserves most history).
 * All operations run inside a single PostgreSQL transaction — full rollback on any failure.
 *
 * @param {number[]} customerIds  — IDs of all customers to merge (>= 2)
 * @param {string}   triggerInfo  — human-readable description of what triggered the merge
 * @returns {number} survivorId
 */
async function mergeCustomers(customerIds, triggerInfo = '') {
  if (!customerIds || customerIds.length < 2) {
    throw new Error('mergeCustomers requires at least 2 customer IDs');
  }

  // Pick survivor: oldest by created_at
  const orderRes = await pg.query(
    'SELECT id FROM customers WHERE id = ANY($1) ORDER BY created_at ASC LIMIT 1',
    [customerIds]
  );
  const survivorId = orderRes.rows[0].id;
  const loserIds   = customerIds.filter(id => id !== survivorId);

  const client = await pg.pool.connect();
  try {
    await client.query('BEGIN');

    // ── Reassign child rows to survivor ─────────────────────────────────

    await client.query(
      'UPDATE events SET customer_id = $1 WHERE customer_id = ANY($2)',
      [survivorId, loserIds]
    );

    await client.query(
      'UPDATE purchases SET customer_id = $1 WHERE customer_id = ANY($2)',
      [survivorId, loserIds]
    );

    // segment_members has a composite PK — move then delete to avoid dupes
    await client.query(
      `INSERT INTO segment_members (segment_id, customer_id, added_at)
       SELECT segment_id, $1, added_at FROM segment_members
       WHERE customer_id = ANY($2)
       ON CONFLICT DO NOTHING`,
      [survivorId, loserIds]
    );
    await client.query(
      'DELETE FROM segment_members WHERE customer_id = ANY($1)',
      [loserIds]
    );

    // consents: move, keep survivor's record on conflict
    await client.query(
      `INSERT INTO consents (customer_id, purpose, granted, updated_at)
       SELECT $1, purpose, granted, updated_at FROM consents
       WHERE customer_id = ANY($2)
       ON CONFLICT (customer_id, purpose) DO NOTHING`,
      [survivorId, loserIds]
    );
    await client.query(
      'DELETE FROM consents WHERE customer_id = ANY($1)',
      [loserIds]
    );

    // consent_history: reassign
    await client.query(
      'UPDATE consent_history SET customer_id = $1 WHERE customer_id = ANY($2)',
      [survivorId, loserIds]
    );

    // customer_identifiers: reassign
    await client.query(
      'UPDATE customer_identifiers SET customer_id = $1 WHERE customer_id = ANY($2)',
      [survivorId, loserIds]
    );

    // ── NULL out unique-constrained fields on losers FIRST ──────────────
    // Prevents UNIQUE violations on customers(email, phone, user_id)
    // when the survivor UPDATE does COALESCE on those same values.
    await client.query(
      `UPDATE customers SET email = NULL, phone = NULL, user_id = NULL WHERE id = ANY($1)`,
      [loserIds]
    );

    // ── Update survivor aggregates ───────────────────────────────────────

    const aggRes = await client.query(
      `SELECT
         COALESCE(SUM(total_spent), 0)  AS total_spent,
         COALESCE(SUM(total_events), 0) AS total_events,
         MAX(last_seen_at)              AS last_seen_at,
         MIN(email)     FILTER (WHERE email IS NOT NULL)      AS email,
         MIN(phone)     FILTER (WHERE phone IS NOT NULL)      AS phone,
         MIN(user_id)   FILTER (WHERE user_id IS NOT NULL)    AS user_id,
         MIN(first_name)FILTER (WHERE first_name IS NOT NULL) AS first_name,
         MIN(last_name) FILTER (WHERE last_name IS NOT NULL)  AS last_name
       FROM customers WHERE id = ANY($1)`,
      [loserIds]
    );
    const agg = aggRes.rows[0];

    await client.query(
      `UPDATE customers SET
         total_spent  = total_spent  + $2,
         total_events = total_events + $3,
         last_seen_at = GREATEST(last_seen_at, $4),
         email        = COALESCE(email,      $5),
         phone        = COALESCE(phone,      $6),
         user_id      = COALESCE(user_id,    $7),
         first_name   = COALESCE(first_name, $8),
         last_name    = COALESCE(last_name,  $9)
       WHERE id = $1`,
      [
        survivorId,
        parseFloat(agg.total_spent)  || 0,
        parseInt(agg.total_events)   || 0,
        agg.last_seen_at,
        agg.email,
        agg.phone,
        agg.user_id,
        agg.first_name,
        agg.last_name
      ]
    );

    // ── Soft-delete losers ───────────────────────────────────────────────

    await client.query(
      `UPDATE customers SET
         is_merged = TRUE,
         merged_into_customer_id = $1
       WHERE id = ANY($2)`,
      [survivorId, loserIds]
    );

    // ── Audit trail ──────────────────────────────────────────────────────

    for (const loserId of loserIds) {
      await client.query(
        `INSERT INTO merge_history (survivor_id, merged_id, trigger_event, merged_by)
         VALUES ($1, $2, $3, 'system')`,
        [survivorId, loserId, triggerInfo]
      );
    }

    await client.query('COMMIT');
    return survivorId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Upsert identifier rows into customer_identifiers for a given customer.
 * Silently ignores conflicts (already registered).
 */
async function registerIdentifiers(customerId, { user_id, email, phone }) {
  const pairs = [
    { type: 'email',   value: email   },
    { type: 'phone',   value: phone   },
    { type: 'user_id', value: user_id }
  ].filter(p => p.value);

  for (const { type, value } of pairs) {
    try {
      await pg.query(
        `INSERT INTO customer_identifiers (customer_id, type, value, source)
         VALUES ($1, $2, $3, 'event')
         ON CONFLICT (type, value) DO NOTHING`,
        [customerId, type, value]
      );
    } catch (err) {
      console.warn(`registerIdentifiers: ${type}=${value} —`, err.message);
    }
  }
}

module.exports = { mergeCustomers, registerIdentifiers };
