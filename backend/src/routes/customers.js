'use strict';

const express = require('express');
const pg      = require('../db/postgres');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── PII masking helpers ───────────────────────────────────────────────────────

function maskEmail(email) {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 1) return '***@***';
  return email[0] + '***@' + email.slice(at + 1);
}

function maskPhone(phone) {
  if (!phone) return null;
  // Show +91 prefix + last 4 digits, mask the middle
  if (phone.length >= 7) {
    return phone.slice(0, 3) + ' ****' + phone.slice(-4);
  }
  return '****';
}

function applyMask(customer, role) {
  if (role !== 'marketer') return customer;
  return {
    ...customer,
    email:   maskEmail(customer.email),
    phone:   maskPhone(customer.phone),
    user_id: customer.user_id ? '***' : null,
    _pii_masked: true
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customers
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const search = req.query.q ? `%${req.query.q.toLowerCase()}%` : null;
    const limit  = Math.min(parseInt(req.query.limit) || 100, 200);

    let result;
    if (search) {
      result = await pg.query(
        `SELECT id, user_id, email, phone, first_name, last_name, city, country,
                lifecycle_stage, total_spent, total_events, last_seen_at, created_at
         FROM customers
         WHERE (is_merged IS NULL OR is_merged = FALSE)
           AND (LOWER(email) LIKE $1
                OR LOWER(first_name || ' ' || last_name) LIKE $1
                OR phone LIKE $1)
         ORDER BY last_seen_at DESC NULLS LAST
         LIMIT $2`,
        [search, limit]
      );
    } else {
      result = await pg.query(
        `SELECT id, user_id, email, phone, first_name, last_name, city, country,
                lifecycle_stage, total_spent, total_events, last_seen_at, created_at
         FROM customers
         WHERE (is_merged IS NULL OR is_merged = FALSE)
         ORDER BY last_seen_at DESC NULLS LAST
         LIMIT $1`,
        [limit]
      );
    }

    const customers = result.rows.map(c => applyMask(c, req.user.role));
    res.json({ customers, count: customers.length });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customers/:id
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid customer id' });

    // 1. Customer
    const customerRes = await pg.query(
      'SELECT * FROM customers WHERE id = $1 AND (is_merged IS NULL OR is_merged = FALSE)',
      [id]
    );
    if (!customerRes.rows.length) return res.status(404).json({ error: 'Customer not found' });
    const customer = applyMask(customerRes.rows[0], req.user.role);

    // 2. Purchases
    const purchasesRes = await pg.query(
      `SELECT id, amount, product_name, created_at
       FROM purchases WHERE customer_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    // 3. Event timeline
    const eventsRes = await pg.query(
      `SELECT event_type, properties, timestamp, consent_verified
       FROM events WHERE customer_id = $1
       ORDER BY timestamp DESC LIMIT 30`,
      [id]
    );

    // 4. Segments
    const segmentsRes = await pg.query(
      `SELECT s.id, s.name, s.description, sm.added_at
       FROM segments s
       JOIN segment_members sm ON sm.segment_id = s.id
       WHERE sm.customer_id = $1`,
      [id]
    );

    // 5. Consents (all purposes)
    const consentsRes = await pg.query(
      `SELECT purpose, granted, updated_at FROM consents WHERE customer_id = $1
       ORDER BY purpose`,
      [id]
    );

    // 6. Merge history — was anything merged INTO this customer?
    const mergeRes = await pg.query(
      `SELECT mh.id, mh.merged_id, mh.trigger_event, mh.merged_at,
              c.email AS merged_email, c.first_name, c.last_name
       FROM merge_history mh
       LEFT JOIN customers c ON c.id = mh.merged_id
       WHERE mh.survivor_id = $1
       ORDER BY mh.merged_at DESC`,
      [id]
    );

    // 7. Known identifiers
    const identifiersRes = await pg.query(
      `SELECT type, value, source, created_at
       FROM customer_identifiers WHERE customer_id = $1
       ORDER BY type, created_at`,
      [id]
    );

    res.json({
      customer,
      purchases:   purchasesRes.rows,
      events:      eventsRes.rows,
      segments:    segmentsRes.rows,
      consents:    consentsRes.rows,
      merge_history: mergeRes.rows,
      identifiers: req.user.role !== 'marketer' ? identifiersRes.rows : []
    });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
