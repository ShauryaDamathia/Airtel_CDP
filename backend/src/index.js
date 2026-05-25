require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const pg = require('./db/postgres');

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
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
})();
