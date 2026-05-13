-- =====================================================================
-- CDP Prototype - PostgreSQL Schema (single database)
-- Run with: psql -U postgres -d cdp -f schema.sql
-- =====================================================================

DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS consents CASCADE;
DROP TABLE IF EXISTS segment_members CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------------
-- USERS - internal employees who log in to the dashboard
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,         -- bcrypt hash
  full_name    VARCHAR(255) NOT NULL,
  role         VARCHAR(32) NOT NULL CHECK (role IN ('admin','analyst','marketer','compliance')),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- CUSTOMERS - unified customer profiles
-- ---------------------------------------------------------------------
CREATE TABLE customers (
  id              SERIAL PRIMARY KEY,
  user_id         VARCHAR(64) UNIQUE,         -- external user_id (after login)
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(32) UNIQUE,
  first_name      VARCHAR(128),
  last_name       VARCHAR(128),
  city            VARCHAR(128),
  country         VARCHAR(64) DEFAULT 'IN',
  lifecycle_stage VARCHAR(32) DEFAULT 'new',  -- new, active, dormant, vip
  total_spent     NUMERIC(12,2) DEFAULT 0,
  total_events    INT DEFAULT 0,
  last_seen_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_user_id ON customers(user_id);

-- ---------------------------------------------------------------------
-- EVENTS - behavioral event log (page_view, login, purchase, etc.)
-- properties is a flexible JSONB column for event-specific data
-- ---------------------------------------------------------------------
CREATE TABLE events (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  INT REFERENCES customers(id) ON DELETE CASCADE,
  event_type   VARCHAR(64) NOT NULL,
  user_id      VARCHAR(64),
  email        VARCHAR(255),
  phone        VARCHAR(32),
  properties   JSONB DEFAULT '{}',
  timestamp    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_customer ON events(customer_id, timestamp DESC);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_email ON events(email);

-- ---------------------------------------------------------------------
-- PURCHASES - transaction records linked to customer
-- ---------------------------------------------------------------------
CREATE TABLE purchases (
  id           SERIAL PRIMARY KEY,
  customer_id  INT REFERENCES customers(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  product_name VARCHAR(255),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_purchases_customer ON purchases(customer_id);

-- ---------------------------------------------------------------------
-- SEGMENTS - rule-based customer groups
-- ---------------------------------------------------------------------
CREATE TABLE segments (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(128) NOT NULL,
  description  TEXT,
  rule_type    VARCHAR(64) NOT NULL,  -- 'high_spenders', 'active_users', 'inactive_users'
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- SEGMENT MEMBERSHIP - who belongs to which segment
-- ---------------------------------------------------------------------
CREATE TABLE segment_members (
  segment_id   INT REFERENCES segments(id) ON DELETE CASCADE,
  customer_id  INT REFERENCES customers(id) ON DELETE CASCADE,
  added_at     TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (segment_id, customer_id)
);

-- ---------------------------------------------------------------------
-- CONSENTS - per-purpose consent records
-- ---------------------------------------------------------------------
CREATE TABLE consents (
  id           SERIAL PRIMARY KEY,
  customer_id  INT REFERENCES customers(id) ON DELETE CASCADE,
  purpose      VARCHAR(32) NOT NULL,    -- 'analytics' | 'marketing'
  granted      BOOLEAN NOT NULL,
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (customer_id, purpose)
);

CREATE INDEX idx_consents_customer ON consents(customer_id);
