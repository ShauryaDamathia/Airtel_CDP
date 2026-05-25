-- =========================================================================
-- CDP Prototype — Feature Migration (run AFTER schema.sql + seed.sql)
-- psql -U postgres -d cdp -f database/migration.sql
-- =========================================================================

-- ─── Feature 1: Fuzzy matching ───────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_customers_email_trgm ON customers USING gin (email gin_trgm_ops);

CREATE TABLE IF NOT EXISTS pending_matches (
  id                  SERIAL PRIMARY KEY,
  incoming_identifier TEXT NOT NULL,
  identifier_type     VARCHAR(32) NOT NULL,          -- 'email' | 'phone'
  matched_customer_id INT REFERENCES customers(id),
  similarity_score    NUMERIC(4,3),
  status              VARCHAR(32) DEFAULT 'pending', -- 'pending' | 'confirmed' | 'rejected'
  reviewed_by         INT REFERENCES users(id),
  reviewed_at         TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_matches_status ON pending_matches(status);

-- ─── Feature 2: Profile merging ──────────────────────────────────────────

ALTER TABLE customers ADD COLUMN IF NOT EXISTS merged_into_customer_id INT REFERENCES customers(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS customer_identifiers (
  id          SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
  type        VARCHAR(32) NOT NULL,   -- 'email' | 'phone' | 'user_id'
  value       TEXT NOT NULL,
  source      VARCHAR(64),
  confidence  NUMERIC(3,2) DEFAULT 1.0,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (type, value)
);

CREATE INDEX IF NOT EXISTS idx_identifiers_lookup   ON customer_identifiers(type, value);
CREATE INDEX IF NOT EXISTS idx_identifiers_customer ON customer_identifiers(customer_id);

-- Backfill identifiers from existing customers
INSERT INTO customer_identifiers (customer_id, type, value, source)
  SELECT id, 'email', email, 'import' FROM customers
  WHERE email IS NOT NULL AND (is_merged IS NULL OR is_merged = FALSE)
  ON CONFLICT (type, value) DO NOTHING;

INSERT INTO customer_identifiers (customer_id, type, value, source)
  SELECT id, 'phone', phone, 'import' FROM customers
  WHERE phone IS NOT NULL AND (is_merged IS NULL OR is_merged = FALSE)
  ON CONFLICT (type, value) DO NOTHING;

INSERT INTO customer_identifiers (customer_id, type, value, source)
  SELECT id, 'user_id', user_id, 'import' FROM customers
  WHERE user_id IS NOT NULL AND (is_merged IS NULL OR is_merged = FALSE)
  ON CONFLICT (type, value) DO NOTHING;

CREATE TABLE IF NOT EXISTS merge_history (
  id            SERIAL PRIMARY KEY,
  survivor_id   INT REFERENCES customers(id),
  merged_id     INT,
  trigger_event TEXT,
  merged_by     VARCHAR(32) DEFAULT 'system',
  merged_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merge_history_survivor ON merge_history(survivor_id);

-- ─── Feature 3: Consent ──────────────────────────────────────────────────

ALTER TABLE events ADD COLUMN IF NOT EXISTS consent_verified BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS consent_history (
  id             SERIAL PRIMARY KEY,
  customer_id    INT REFERENCES customers(id) ON DELETE CASCADE,
  purpose        VARCHAR(64) NOT NULL,
  granted        BOOLEAN NOT NULL,
  legal_basis    VARCHAR(64) NOT NULL DEFAULT 'consent',
  source         VARCHAR(64),     -- 'signup_form' | 'preference_centre' | 'admin_override' | 'import'
  channel        VARCHAR(64),     -- 'web' | 'mobile' | 'email' | 'api'
  policy_version VARCHAR(32),
  recorded_by    INT REFERENCES users(id),
  ip_address     VARCHAR(45),
  notes          TEXT,
  recorded_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_history_customer ON consent_history(customer_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_history_purpose  ON consent_history(purpose);

-- Backfill history from existing consents
INSERT INTO consent_history (customer_id, purpose, granted, source, channel, recorded_at)
  SELECT customer_id, purpose, granted, 'import', 'api', updated_at FROM consents
  ON CONFLICT DO NOTHING;

-- ─── Expand consent purposes ─────────────────────────────────────────────

-- marketing_email (mirrors legacy 'marketing')
INSERT INTO consents (customer_id, purpose, granted)
  SELECT customer_id, 'marketing_email', granted FROM consents
  WHERE purpose = 'marketing'
  ON CONFLICT (customer_id, purpose) DO NOTHING;

-- marketing_sms (~67% granted)
INSERT INTO consents (customer_id, purpose, granted)
  SELECT id, 'marketing_sms', (id % 3 != 0)
  FROM customers WHERE (is_merged IS NULL OR is_merged = FALSE)
  ON CONFLICT (customer_id, purpose) DO NOTHING;

-- personalization (~86% granted)
INSERT INTO consents (customer_id, purpose, granted)
  SELECT id, 'personalization', (id % 7 != 0)
  FROM customers WHERE (is_merged IS NULL OR is_merged = FALSE)
  ON CONFLICT (customer_id, purpose) DO NOTHING;

-- third_party_sharing (20% granted)
INSERT INTO consents (customer_id, purpose, granted)
  SELECT id, 'third_party_sharing', (id % 5 = 0)
  FROM customers WHERE (is_merged IS NULL OR is_merged = FALSE)
  ON CONFLICT (customer_id, purpose) DO NOTHING;

-- data_retention (100% granted)
INSERT INTO consents (customer_id, purpose, granted)
  SELECT id, 'data_retention', TRUE
  FROM customers WHERE (is_merged IS NULL OR is_merged = FALSE)
  ON CONFLICT (customer_id, purpose) DO NOTHING;

-- Backfill new purposes into consent_history
INSERT INTO consent_history (customer_id, purpose, granted, source, channel)
  SELECT customer_id, purpose, granted, 'import', 'api'
  FROM consents
  WHERE purpose IN ('marketing_email','marketing_sms','personalization','third_party_sharing','data_retention')
  ON CONFLICT DO NOTHING;
