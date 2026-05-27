'use strict';

const express = require('express');
const pg      = require('../db/postgres');
const { requireAuth }                        = require('../middleware/auth');
const { normalizeIdentifiers }               = require('../utils/normalize');
const { mergeCustomers, registerIdentifiers } = require('../utils/merge');
const { hasConsent }                          = require('../utils/consent');
const { updateLifecycleStage }                = require('../utils/lifecycle');
const { recomputeAllSegments }                = require('../utils/segments');

const router = express.Router();

const FUZZY_THRESHOLD = parseFloat(process.env.FUZZY_MATCH_THRESHOLD) || 0.82;

// ─────────────────────────────────────────────────────────────────────────────
// resolveIdentity
//
// 1. Normalize all incoming identifiers
// 2. Look up customer_identifiers for ANY match
// 3. Handle result:
//    0 matches → create new customer + register identifiers
//    1 match   → use existing, register any new identifiers
//    2+ matches → merge all matched customers, use survivor
// 4. Fuzzy email fallback if exact lookup returns 0 matches
// ─────────────────────────────────────────────────────────────────────────────

async function resolveIdentity(raw) {
  const { user_id, email, phone, first_name, last_name } = normalizeIdentifiers(raw);

  // Build lookup conditions (only non-null identifiers)
  const conditions = [];
  const values     = [];
  let   idx        = 1;
  if (user_id) { conditions.push(`(type = 'user_id' AND value = $${idx++})`); values.push(user_id); }
  if (email)   { conditions.push(`(type = 'email'   AND value = $${idx++})`); values.push(email);   }
  if (phone)   { conditions.push(`(type = 'phone'   AND value = $${idx++})`); values.push(phone);   }

  if (!conditions.length) {
    throw new Error('At least one of user_id, email, phone is required');
  }

  // ── Exact lookup via customer_identifiers ────────────────────────────────

  const exactRes = await pg.query(
    `SELECT DISTINCT customer_id FROM customer_identifiers
     WHERE ${conditions.join(' OR ')}`,
    values
  );

  let matchedIds = exactRes.rows.map(r => r.customer_id);

  // ── Fuzzy email fallback ──────────────────────────────────────────────────

  if (matchedIds.length === 0 && email) {
    const fuzzyRes = await pg.query(
      `SELECT ci.customer_id, similarity(ci.value, $1) AS score
       FROM customer_identifiers ci
       WHERE ci.type = 'email'
         AND similarity(ci.value, $1) > $2
       ORDER BY score DESC
       LIMIT 1`,
      [email, FUZZY_THRESHOLD]
    );

    if (fuzzyRes.rows.length) {
      const fuzzyCustomerId = fuzzyRes.rows[0].customer_id;
      const fuzzyScore      = fuzzyRes.rows[0].score;

      // Log for human review (don't block the event)
      await pg.query(
        `INSERT INTO pending_matches
           (incoming_identifier, identifier_type, matched_customer_id, similarity_score, status)
         VALUES ($1, 'email', $2, $3, 'pending')`,
        [email, fuzzyCustomerId, fuzzyScore]
      ).catch(err => console.warn('pending_match insert failed:', err.message));

      console.log(`[fuzzy] ${email} → customer #${fuzzyCustomerId} (score ${fuzzyScore})`);
      matchedIds = [fuzzyCustomerId];
    }
  }

  // ── Result handling ───────────────────────────────────────────────────────

  let customerId;

  if (matchedIds.length === 0) {
    // Create new customer
    const ins = await pg.query(
      `INSERT INTO customers
         (user_id, email, phone, first_name, last_name, lifecycle_stage, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, 'new', NOW())
       RETURNING id`,
      [user_id || null, email || null, phone || null, first_name || null, last_name || null]
    );
    customerId = ins.rows[0].id;

    // Auto-seed default consent records for the new customer.
    // Represents the customer accepting terms at sign-up.
    // analytics + personalization + data_retention = true
    // marketing_email + marketing_sms = true (opt-out model for demo)
    // third_party_sharing = false (privacy-first default)
    await pg.query(
      `INSERT INTO consents (customer_id, purpose, granted)
       SELECT $1, unnest(ARRAY['analytics','marketing_email','marketing_sms','personalization','data_retention','third_party_sharing']),
                  unnest(ARRAY[true,       true,              true,            true,              true,             false])
       ON CONFLICT (customer_id, purpose) DO NOTHING`,
      [customerId]
    ).catch(err => console.warn('consent seed failed:', err.message));

  } else if (matchedIds.length === 1) {
    customerId = matchedIds[0];

    // Backfill missing identifiers on the customer row
    await pg.query(
      `UPDATE customers SET
         user_id    = COALESCE(user_id,    $2),
         email      = COALESCE(email,      $3),
         phone      = COALESCE(phone,      $4),
         first_name = COALESCE(first_name, $5),
         last_name  = COALESCE(last_name,  $6)
       WHERE id = $1`,
      [customerId, user_id || null, email || null, phone || null,
       first_name || null, last_name || null]
    );

  } else {
    // 2+ matches — merge into oldest customer
    const trigger = [
      user_id ? `user_id:${user_id}` : null,
      email   ? `email:${email}`     : null,
      phone   ? `phone:${phone}`     : null
    ].filter(Boolean).join(', ');

    customerId = await mergeCustomers(matchedIds, trigger);
  }

  // Register all identifiers from this event
  await registerIdentifiers(customerId, { user_id, email, phone });

  return customerId;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/events
// Public endpoint — website SDK would call this in production.
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const {
      event_type, user_id, email, phone,
      first_name, last_name, properties = {}
    } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type required' });
    }
    if (!user_id && !email && !phone) {
      return res.status(400).json({ error: 'At least one of user_id, email, phone required' });
    }

    // 1. Resolve identity
    const customerId = await resolveIdentity({ user_id, email, phone, first_name, last_name });

    // 2. Consent check — tag event if analytics consent denied
    const consentVerified = await hasConsent(customerId, 'analytics');

    // 3. Store event
    await pg.query(
      `INSERT INTO events
         (customer_id, event_type, user_id, email, phone, properties, timestamp, consent_verified)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        customerId, event_type,
        user_id || null,
        email   ? email.trim().toLowerCase() : null,
        phone   || null,
        properties,
        consentVerified
      ]
    );

    // 4. Update customer aggregates
    await pg.query(
      `UPDATE customers SET total_events = total_events + 1, last_seen_at = NOW() WHERE id = $1`,
      [customerId]
    );

    // 5. If purchase, store transaction
    if (event_type === 'purchase' && properties.amount) {
      await pg.query(
        `INSERT INTO purchases (customer_id, amount, product_name) VALUES ($1, $2, $3)`,
        [customerId, properties.amount, properties.product_name || 'Unnamed product']
      );
      await pg.query(
        'UPDATE customers SET total_spent = total_spent + $1 WHERE id = $2',
        [properties.amount, customerId]
      );
    }

    // 6. Respond immediately — don't make the caller wait for analytics work
    res.status(202).json({ ok: true, customer_id: customerId });

    // 7. Post-response async: recalculate lifecycle stage + refresh all segments.
    //    Fire-and-forget — errors are logged inside each utility, never thrown.
    updateLifecycleStage(customerId);
    recomputeAllSegments();

  } catch (err) {
    console.error('Event ingestion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events  — recent events list (authenticated)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await pg.query(
      `SELECT id, customer_id, event_type, user_id, email, properties, timestamp, consent_verified
       FROM events
       ORDER BY timestamp DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ events: result.rows });
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
