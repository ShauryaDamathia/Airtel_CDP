require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const pg = require('./db/postgres');
const { updateAllLifecycleStages } = require('./utils/lifecycle');
const { recomputeAllSegments }     = require('./utils/segments');

const authRoutes      = require('./routes/auth');
const eventsRoutes    = require('./routes/events');
const customersRoutes = require('./routes/customers');
const segmentsRoutes  = require('./routes/segments');
const analyticsRoutes = require('./routes/analytics');
const consentsRoutes  = require('./routes/consents');
const matchesRoutes   = require('./routes/matches');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Public: suggest the next clean user_id for the demo site login button.
// Takes the MAX across both customers.id AND already-registered u_X identifiers
// so we never hand out a user_id that is already linked to an existing profile.
app.get('/api/suggest-uid', async (_req, res) => {
  try {
    const r1 = await pg.query('SELECT COALESCE(MAX(id), 0) AS m FROM customers');
    const r2 = await pg.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(value FROM 3) AS BIGINT)), 0) AS m
       FROM customer_identifiers
       WHERE type = 'user_id' AND value ~ '^u_[0-9]+$'`
    );
    const next = Math.max(parseInt(r1.rows[0].m), parseInt(r2.rows[0].m)) + 1;
    res.json({ user_id: `u_${next}` });
  } catch {
    res.json({ user_id: `u_${Date.now() % 90000 + 10000}` });
  }
});

app.use('/api/auth',      authRoutes);
app.use('/api/events',    eventsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/segments',  segmentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/consents',  consentsRoutes);
app.use('/api/matches',   matchesRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await pg.query('SELECT 1');
    console.log('[ok] PostgreSQL connected');
    app.listen(PORT, () => {
      console.log(`[ok] CDP Backend running on http://localhost:${PORT}`);
    });

    // On startup: fix any stale lifecycle stages + refresh segment membership
    await updateAllLifecycleStages();
    await recomputeAllSegments();
    console.log('[ok] Lifecycle stages and segments refreshed');
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
})();
