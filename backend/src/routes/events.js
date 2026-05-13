const express = require('express');
const pg = require('../db/postgres');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * IDENTITY RESOLUTION
 * --------------------------------------------------------------------
 * Match an incoming event to an existing customer using:
 *   1. user_id  (strongest)
 *   2. email
 *   3. phone
 * If no match found, create a new customer.
 * Returns: customer_id (PostgreSQL primary key)
 */
async function resolveIdentity({ user_id, email, phone, first_name, last_name }) {
  let result;

  if (user_id) {
    result = await pg.query('SELECT id FROM customers WHERE user_id = $1', [user_id]);
    if (result.rows.length) return result.rows[0].id;
  }
  if (email) {
    result = await pg.query('SELECT id FROM customers WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length) {
      // Backfill user_id / phone if missing
      const id = result.rows[0].id;
      await pg.query(
        `UPDATE customers SET
          user_id = COALESCE(user_id, $2),
          phone   = COALESCE(phone,   $3)
         WHERE id = $1`,
        [id, user_id || null, phone || null]
      );
      return id;
    }
  }
  if (phone) {
    result = await pg.query('SELECT id FROM customers WHERE phone = $1', [phone]);
    if (result.rows.length) {
      const id = result.rows[0].id;
      await pg.query(
        `UPDATE customers SET
          user_id = COALESCE(user_id, $2),
          email   = COALESCE(email,   $3)
         WHERE id = $1`,
        [id, user_id || null, email ? email.toLowerCase() : null]
      );
      return id;
    }
  }

  // No match — create new customer
  const insertRes = await pg.query(
    `INSERT INTO customers (user_id, email, phone, first_name, last_name, lifecycle_stage, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, 'new', NOW())
     RETURNING id`,
    [
      user_id || null,
      email ? email.toLowerCase() : null,
      phone || null,
      first_name || null,
      last_name || null
    ]
  );
  return insertRes.rows[0].id;
}

/**
 * POST /api/events
 * Ingest a single event. Public endpoint (would be SDK-side in production).
 *
 * Body: {
 *   event_type: 'page_view' | 'login' | 'purchase',
 *   user_id?: string, email?: string, phone?: string,
 *   first_name?: string, last_name?: string,
 *   properties?: object
 * }
 *
 * For purchase events, properties.amount creates a transaction.
 */
router.post('/', async (req, res) => {
  try {
    const { event_type, user_id, email, phone, first_name, last_name, properties = {} } = req.body;
    if (!event_type) return res.status(400).json({ error: 'event_type required' });
    if (!user_id && !email && !phone) {
      return res.status(400).json({ error: 'At least one of user_id, email, phone required' });
    }

    // 1. Resolve identity (find or create customer)
    const customerId = await resolveIdentity({ user_id, email, phone, first_name, last_name });

    // 2. Store event in PostgreSQL
    await pg.query(
      `INSERT INTO events (customer_id, event_type, user_id, email, phone, properties, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        customerId,
        event_type,
        user_id || null,
        email ? email.toLowerCase() : null,
        phone || null,
        properties
      ]
    );

    // 3. Update customer aggregates
    await pg.query(
      `UPDATE customers SET
         total_events = total_events + 1,
         last_seen_at = NOW()
       WHERE id = $1`,
      [customerId]
    );

    // 4. If it's a purchase, store the transaction and update total_spent
    if (event_type === 'purchase' && properties.amount) {
      await pg.query(
        `INSERT INTO purchases (customer_id, amount, product_name) VALUES ($1, $2, $3)`,
        [customerId, properties.amount, properties.product_name || 'Unnamed product']
      );
      await pg.query(
        `UPDATE customers SET total_spent = total_spent + $1 WHERE id = $2`,
        [properties.amount, customerId]
      );
    }

    res.status(202).json({ ok: true, customer_id: customerId });
  } catch (err) {
    console.error('Event ingestion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/events
 * List recent events (admin/analyst view).
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await pg.query(
      `SELECT id, customer_id, event_type, user_id, email, properties, timestamp
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
