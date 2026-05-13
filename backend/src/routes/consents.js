const express = require('express');
const pg = require('../db/postgres');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/consents
 * List all consent records joined with customer info.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT c.id, c.customer_id, c.purpose, c.granted, c.updated_at,
             cu.email, cu.first_name, cu.last_name
      FROM consents c
      JOIN customers cu ON cu.id = c.customer_id
      ORDER BY c.updated_at DESC
      LIMIT 200
    `);
    res.json({ consents: result.rows });
  } catch (err) {
    console.error('List consents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/consents/customer/:id
 * Get all consents for a customer.
 */
router.get('/customer/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pg.query(
      'SELECT purpose, granted, updated_at FROM consents WHERE customer_id = $1',
      [id]
    );
    res.json({ consents: result.rows });
  } catch (err) {
    console.error('Get consents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/consents
 * Create or update a consent record. (Admin / Compliance only)
 *
 * Body: { customer_id, purpose, granted }
 */
router.post('/', requireRole('compliance'), async (req, res) => {
  try {
    const { customer_id, purpose, granted } = req.body;
    if (!customer_id || !purpose || granted === undefined) {
      return res.status(400).json({ error: 'customer_id, purpose, granted required' });
    }
    if (!['analytics', 'marketing'].includes(purpose)) {
      return res.status(400).json({ error: 'purpose must be analytics or marketing' });
    }

    const result = await pg.query(
      `INSERT INTO consents (customer_id, purpose, granted, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (customer_id, purpose)
       DO UPDATE SET granted = EXCLUDED.granted, updated_at = NOW()
       RETURNING *`,
      [customer_id, purpose, granted]
    );

    res.json({ ok: true, consent: result.rows[0] });
  } catch (err) {
    console.error('Update consent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
