/**
 * Seed sample events into PostgreSQL for the demo.
 * Generates ~600 events across 20 customers over the last 14 days.
 *
 * Run with: npm run seed:events
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'cdp'
});

const EVENT_TYPES = ['page_view', 'page_view', 'page_view', 'login', 'login', 'purchase'];
const PAGES = ['/home', '/products', '/pricing', '/about', '/checkout', '/account', '/dashboard'];
const PRODUCTS = ['Premium Plan', 'Enterprise Bundle', 'Add-on Pack', 'Annual Subscription'];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  console.log('Loading customers from PostgreSQL...');
  const customersRes = await pool.query(
    'SELECT id, user_id, email, phone FROM customers ORDER BY id'
  );
  const customers = customersRes.rows;
  if (!customers.length) {
    console.error('No customers found. Run schema.sql + seed.sql first.');
    process.exit(1);
  }
  console.log(`✓ Found ${customers.length} customers`);

  // Clear existing events
  await pool.query('TRUNCATE events RESTART IDENTITY');
  console.log('✓ Cleared existing events');

  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  let inserted = 0;

  for (const customer of customers) {
    const eventCount = 20 + Math.floor(Math.random() * 25);
    const values = [];
    const params = [];
    let p = 1;

    for (let i = 0; i < eventCount; i++) {
      const eventType = pickRandom(EVENT_TYPES);
      const offsetMs = Math.floor(Math.random() * fourteenDays);
      const timestamp = new Date(now - offsetMs);

      let properties = {};
      if (eventType === 'page_view') properties.page = pickRandom(PAGES);
      else if (eventType === 'login') properties.method = pickRandom(['email', 'sso', 'phone_otp']);
      else if (eventType === 'purchase') {
        properties.amount = 1000 + Math.floor(Math.random() * 15000);
        properties.product_name = pickRandom(PRODUCTS);
      }

      values.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(
        customer.id,
        eventType,
        customer.user_id,
        customer.email,
        customer.phone,
        JSON.stringify(properties),
        timestamp
      );
    }

    if (values.length) {
      await pool.query(
        `INSERT INTO events (customer_id, event_type, user_id, email, phone, properties, timestamp)
         VALUES ${values.join(', ')}`,
        params
      );
      inserted += eventCount;
    }
  }

  console.log(`✓ Inserted ${inserted} events into PostgreSQL`);
  await pool.end();
  console.log('✓ Done');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
