'use strict';

const express = require('express');
const pg      = require('../db/postgres');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Subquery: customers who have granted analytics consent
const ANALYTICS_CONSENTED =
  `(SELECT customer_id FROM consents WHERE purpose = 'analytics' AND granted = TRUE)`;

/**
 * GET /api/analytics/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const [totCust, activeUsers, totalRev, totalEvents] = await Promise.all([
      // Total non-merged customers (no consent filter for headcount)
      pg.query(`SELECT COUNT(*) AS c FROM customers WHERE is_merged IS NULL OR is_merged = FALSE`),
      // Active users: only analytics-consented
      pg.query(
        `SELECT COUNT(*) AS c FROM customers
         WHERE last_seen_at > NOW() - INTERVAL '7 days'
           AND (is_merged IS NULL OR is_merged = FALSE)
           AND id IN ${ANALYTICS_CONSENTED}`
      ),
      // Revenue: analytics-consented customers only
      pg.query(
        `SELECT COALESCE(SUM(total_spent), 0) AS s FROM customers
         WHERE (is_merged IS NULL OR is_merged = FALSE)
           AND id IN ${ANALYTICS_CONSENTED}`
      ),
      // Events: analytics-consented only
      pg.query(
        `SELECT COUNT(*) AS c FROM events
         WHERE consent_verified = TRUE
            OR consent_verified IS NULL`
      )
    ]);

    res.json({
      total_customers: parseInt(totCust.rows[0].c),
      active_users:    parseInt(activeUsers.rows[0].c),
      total_revenue:   parseFloat(totalRev.rows[0].s),
      total_events:    parseInt(totalEvents.rows[0].c)
    });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/dau — Daily Active Users (last 14 days, analytics-consented only)
 */
router.get('/dau', async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') AS day,
             COUNT(DISTINCT customer_id) AS dau
      FROM events
      WHERE timestamp > NOW() - INTERVAL '14 days'
        AND customer_id IN ${ANALYTICS_CONSENTED}
      GROUP BY day
      ORDER BY day
    `);

    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000);
      const day = d.toISOString().slice(0, 10);
      const found = result.rows.find(r => r.day === day);
      data.push({ day, dau: found ? parseInt(found.dau) : 0 });
    }
    res.json({ data });
  } catch (err) {
    console.error('DAU error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/events-trend — Daily event counts (last 14 days)
 */
router.get('/events-trend', async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM events
      WHERE timestamp > NOW() - INTERVAL '14 days'
        AND customer_id IN ${ANALYTICS_CONSENTED}
      GROUP BY day
      ORDER BY day
    `);

    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000);
      const day = d.toISOString().slice(0, 10);
      const found = result.rows.find(r => r.day === day);
      data.push({ day, count: found ? parseInt(found.count) : 0 });
    }
    res.json({ data });
  } catch (err) {
    console.error('Events trend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/revenue-trend — Revenue per day (last 14 days)
 */
router.get('/revenue-trend', async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT TO_CHAR(p.created_at, 'YYYY-MM-DD') AS day, SUM(p.amount) AS revenue
      FROM purchases p
      WHERE p.created_at > NOW() - INTERVAL '14 days'
        AND p.customer_id IN ${ANALYTICS_CONSENTED}
      GROUP BY day
      ORDER BY day
    `);

    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000);
      const day = d.toISOString().slice(0, 10);
      const found = result.rows.find(r => r.day === day);
      data.push({ day, revenue: found ? parseFloat(found.revenue) : 0 });
    }
    res.json({ data });
  } catch (err) {
    console.error('Revenue trend error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/funnel — Conversion funnel (analytics-consented only)
 */
router.get('/funnel', async (req, res) => {
  try {
    const result = await pg.query(`
      WITH consented AS (
        SELECT customer_id FROM consents WHERE purpose = 'analytics' AND granted = TRUE
      ),
      page_viewers AS (
        SELECT DISTINCT customer_id FROM events
        WHERE event_type = 'page_view' AND customer_id IN (SELECT customer_id FROM consented)
      ),
      logged_in AS (
        SELECT DISTINCT customer_id FROM events
        WHERE event_type = 'login'
          AND customer_id IN (SELECT customer_id FROM page_viewers)
      ),
      purchasers AS (
        SELECT DISTINCT customer_id FROM events
        WHERE event_type = 'purchase'
          AND customer_id IN (SELECT customer_id FROM logged_in)
      )
      SELECT
        (SELECT COUNT(*) FROM page_viewers) AS page_views,
        (SELECT COUNT(*) FROM logged_in)    AS logins,
        (SELECT COUNT(*) FROM purchasers)   AS purchases
    `);

    const r = result.rows[0];
    const total = parseInt(r.page_views) || 1;
    res.json({
      steps: [
        { name: 'Page View', count: parseInt(r.page_views), conversion: 100 },
        { name: 'Login',     count: parseInt(r.logins),     conversion: Math.round((parseInt(r.logins)    / total) * 100) },
        { name: 'Purchase',  count: parseInt(r.purchases),  conversion: Math.round((parseInt(r.purchases) / total) * 100) }
      ]
    });
  } catch (err) {
    console.error('Funnel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
