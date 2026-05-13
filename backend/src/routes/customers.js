const express = require('express');
const pg = require('../db/postgres');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All customer routes require authentication
router.use(requireAuth);

/**
 * GET /api/customers
 * List customers with optional search.
 */
router.get('/', async (req, res) => {
  try {
    const search = req.query.q ? `%${req.query.q.toLowerCase()}%` : null;
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);

    let result;
    if (search) {
      result = await pg.query(
        `SELECT id, user_id, email, phone, first_name, last_name, city, country,
                lifecycle_stage, total_spent, total_events, last_seen_at, created_at
         FROM customers
         WHERE LOWER(email) LIKE $1
            OR LOWER(first_name || ' ' || last_name) LIKE $1
            OR phone LIKE $1
         ORDER BY last_seen_at DESC NULLS LAST
         LIMIT $2`,
        [search, limit]
      );
    } else {
      result = await pg.query(
        `SELECT id, user_id, email, phone, first_name, last_name, city, country,
                lifecycle_stage, total_spent, total_events, last_seen_at, created_at
         FROM customers
         ORDER BY last_seen_at DESC NULLS LAST
         LIMIT $1`,
        [limit]
      );
    }

    res.json({ customers: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/customers/:id
 * Unified profile view: customer + purchases + events + segments + consent.
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid customer id' });

    // 1. Customer details
    const customerRes = await pg.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (!customerRes.rows.length) return res.status(404).json({ error: 'Customer not found' });
    const customer = customerRes.rows[0];

    // 2. Purchases
    const purchasesRes = await pg.query(
      `SELECT id, amount, product_name, created_at
       FROM purchases
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    );

    // 3. Recent events (timeline)
    const eventsRes = await pg.query(
      `SELECT event_type, properties, timestamp
       FROM events
       WHERE customer_id = $1
       ORDER BY timestamp DESC
       LIMIT 30`,
      [id]
    );

    // 4. Segments this customer belongs to
    const segmentsRes = await pg.query(
      `SELECT s.id, s.name, s.description, sm.added_at
       FROM segments s
       JOIN segment_members sm ON sm.segment_id = s.id
       WHERE sm.customer_id = $1`,
      [id]
    );

    // 5. Consent records
    const consentsRes = await pg.query(
      `SELECT purpose, granted, updated_at FROM consents WHERE customer_id = $1`,
      [id]
    );

    res.json({
      customer,
      purchases: purchasesRes.rows,
      events: eventsRes.rows,
      segments: segmentsRes.rows,
      consents: consentsRes.rows
    });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
