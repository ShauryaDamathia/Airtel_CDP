-- =====================================================================
-- CDP Prototype - Seed Data
-- Run with: psql -U postgres -d cdp -f seed.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- USERS (internal employees)
-- All passwords are: password123
-- bcrypt hash of "password123" with 10 rounds
-- ---------------------------------------------------------------------
INSERT INTO users (email, password, full_name, role) VALUES
('admin@cdp.local',      '$2b$10$ptCLTdMTXNWB438QObrhNOhBs/IW.Usk3QJtcz3paW4Phv8ib3soq', 'Admin User',         'admin'),
('analyst@cdp.local',    '$2b$10$ptCLTdMTXNWB438QObrhNOhBs/IW.Usk3QJtcz3paW4Phv8ib3soq', 'Priya Sharma',       'analyst'),
('marketer@cdp.local',   '$2b$10$ptCLTdMTXNWB438QObrhNOhBs/IW.Usk3QJtcz3paW4Phv8ib3soq', 'Rohan Mehta',        'marketer'),
('compliance@cdp.local', '$2b$10$ptCLTdMTXNWB438QObrhNOhBs/IW.Usk3QJtcz3paW4Phv8ib3soq', 'Vikram Iyer',        'compliance');

-- ---------------------------------------------------------------------
-- CUSTOMERS - 20 sample profiles
-- ---------------------------------------------------------------------
INSERT INTO customers (user_id, email, phone, first_name, last_name, city, country, lifecycle_stage, total_spent, total_events, last_seen_at) VALUES
('u_001', 'rohan.kumar@example.com',    '+919810000001', 'Rohan',   'Kumar',    'Delhi',     'IN', 'vip',     45200.00, 89, NOW() - INTERVAL '2 hours'),
('u_002', 'priya.singh@example.com',    '+919810000002', 'Priya',   'Singh',    'Mumbai',    'IN', 'active',  18400.00, 56, NOW() - INTERVAL '1 day'),
('u_003', 'aditya.patel@example.com',   '+919810000003', 'Aditya',  'Patel',    'Bangalore', 'IN', 'vip',     62800.00, 124,NOW() - INTERVAL '3 hours'),
('u_004', 'neha.gupta@example.com',     '+919810000004', 'Neha',    'Gupta',    'Pune',      'IN', 'active',  12300.00, 41, NOW() - INTERVAL '5 hours'),
('u_005', 'arjun.reddy@example.com',    '+919810000005', 'Arjun',   'Reddy',    'Hyderabad', 'IN', 'new',     2100.00,  8,  NOW() - INTERVAL '1 day'),
('u_006', 'kavya.iyer@example.com',     '+919810000006', 'Kavya',   'Iyer',     'Chennai',   'IN', 'active',  9800.00,  32, NOW() - INTERVAL '8 hours'),
('u_007', 'manish.joshi@example.com',   '+919810000007', 'Manish',  'Joshi',    'Jaipur',    'IN', 'dormant', 5400.00,  19, NOW() - INTERVAL '45 days'),
('u_008', 'ananya.malhotra@example.com','+919810000008', 'Ananya',  'Malhotra', 'Lucknow',   'IN', 'vip',     38900.00, 78, NOW() - INTERVAL '4 hours'),
('u_009', 'yash.kapoor@example.com',    '+919810000009', 'Yash',    'Kapoor',   'Ahmedabad', 'IN', 'active',  14600.00, 47, NOW() - INTERVAL '12 hours'),
('u_010', 'diya.bhatt@example.com',     '+919810000010', 'Diya',    'Bhatt',    'Mumbai',    'IN', 'new',     800.00,   5,  NOW() - INTERVAL '2 days'),
('u_011', 'karan.verma@example.com',    '+919810000011', 'Karan',   'Verma',    'Delhi',     'IN', 'active',  21500.00, 63, NOW() - INTERVAL '6 hours'),
('u_012', 'sneha.rao@example.com',      '+919810000012', 'Sneha',   'Rao',      'Bangalore', 'IN', 'vip',     54300.00, 102,NOW() - INTERVAL '1 hour'),
('u_013', 'rahul.chopra@example.com',   '+919810000013', 'Rahul',   'Chopra',   'Pune',      'IN', 'dormant', 3200.00,  12, NOW() - INTERVAL '60 days'),
('u_014', 'ishaan.khan@example.com',    '+919810000014', 'Ishaan',  'Khan',     'Hyderabad', 'IN', 'active',  16800.00, 52, NOW() - INTERVAL '10 hours'),
('u_015', 'shreya.nair@example.com',    '+919810000015', 'Shreya',  'Nair',     'Chennai',   'IN', 'active',  11200.00, 38, NOW() - INTERVAL '1 day'),
('u_016', 'aaradhya.shah@example.com',  '+919810000016', 'Aaradhya','Shah',     'Mumbai',    'IN', 'new',     1500.00,  7,  NOW() - INTERVAL '3 days'),
('u_017', 'vivaan.agarwal@example.com', '+919810000017', 'Vivaan',  'Agarwal',  'Delhi',     'IN', 'vip',     41200.00, 91, NOW() - INTERVAL '5 hours'),
('u_018', 'riya.menon@example.com',     '+919810000018', 'Riya',    'Menon',    'Bangalore', 'IN', 'active',  19400.00, 58, NOW() - INTERVAL '8 hours'),
('u_019', 'aryan.bose@example.com',     '+919810000019', 'Aryan',   'Bose',     'Kolkata',   'IN', 'dormant', 4100.00,  15, NOW() - INTERVAL '50 days'),
('u_020', 'meera.pillai@example.com',   '+919810000020', 'Meera',   'Pillai',   'Chennai',   'IN', 'active',  13700.00, 44, NOW() - INTERVAL '1 day');

-- ---------------------------------------------------------------------
-- PURCHASES - sample transactions
-- ---------------------------------------------------------------------
INSERT INTO purchases (customer_id, amount, product_name, created_at) VALUES
(1,  12500.00, 'Premium Subscription Plan',     NOW() - INTERVAL '5 days'),
(1,  8400.00,  'Annual Membership',             NOW() - INTERVAL '15 days'),
(1,  15300.00, 'Enterprise Package',            NOW() - INTERVAL '2 days'),
(1,  9000.00,  'Hardware Bundle',               NOW() - INTERVAL '20 days'),
(2,  6200.00,  'Standard Plan',                 NOW() - INTERVAL '10 days'),
(2,  12200.00, 'Premium Add-on',                NOW() - INTERVAL '3 days'),
(3,  18500.00, 'Enterprise Package',            NOW() - INTERVAL '7 days'),
(3,  22000.00, 'Annual Pro Subscription',       NOW() - INTERVAL '25 days'),
(3,  14300.00, 'Extended Warranty',             NOW() - INTERVAL '4 days'),
(3,  8000.00,  'Cloud Storage Upgrade',         NOW() - INTERVAL '12 days'),
(4,  7300.00,  'Standard Plan',                 NOW() - INTERVAL '8 days'),
(4,  5000.00,  'Add-on Package',                NOW() - INTERVAL '20 days'),
(5,  2100.00,  'Starter Pack',                  NOW() - INTERVAL '6 days'),
(6,  4800.00,  'Basic Subscription',            NOW() - INTERVAL '11 days'),
(6,  5000.00,  'Premium Trial',                 NOW() - INTERVAL '4 days'),
(7,  5400.00,  'Standard Subscription',         NOW() - INTERVAL '50 days'),
(8,  16500.00, 'Premium Annual Plan',           NOW() - INTERVAL '6 days'),
(8,  12400.00, 'Enterprise Add-on',             NOW() - INTERVAL '18 days'),
(8,  10000.00, 'Hardware Bundle',               NOW() - INTERVAL '3 days'),
(9,  8600.00,  'Premium Subscription',          NOW() - INTERVAL '13 days'),
(9,  6000.00,  'Add-on Pack',                   NOW() - INTERVAL '5 days'),
(10, 800.00,   'Starter Plan',                  NOW() - INTERVAL '4 days'),
(11, 11500.00, 'Premium Plan',                  NOW() - INTERVAL '9 days'),
(11, 10000.00, 'Annual Subscription',           NOW() - INTERVAL '2 days'),
(12, 22300.00, 'Enterprise Annual',             NOW() - INTERVAL '14 days'),
(12, 18000.00, 'Premium Suite',                 NOW() - INTERVAL '6 days'),
(12, 14000.00, 'Add-on Bundle',                 NOW() - INTERVAL '1 day'),
(13, 3200.00,  'Basic Plan',                    NOW() - INTERVAL '65 days'),
(14, 9800.00,  'Standard Plan',                 NOW() - INTERVAL '16 days'),
(14, 7000.00,  'Premium Add-on',                NOW() - INTERVAL '8 days'),
(15, 6200.00,  'Standard Subscription',         NOW() - INTERVAL '12 days'),
(15, 5000.00,  'Premium Trial',                 NOW() - INTERVAL '5 days'),
(16, 1500.00,  'Starter Pack',                  NOW() - INTERVAL '7 days'),
(17, 15400.00, 'Premium Annual',                NOW() - INTERVAL '10 days'),
(17, 13800.00, 'Enterprise Add-on',             NOW() - INTERVAL '4 days'),
(17, 12000.00, 'Hardware Bundle',               NOW() - INTERVAL '15 days'),
(18, 10400.00, 'Premium Subscription',          NOW() - INTERVAL '11 days'),
(18, 9000.00,  'Annual Plan',                   NOW() - INTERVAL '3 days'),
(19, 4100.00,  'Standard Plan',                 NOW() - INTERVAL '55 days'),
(20, 7700.00,  'Premium Subscription',          NOW() - INTERVAL '14 days'),
(20, 6000.00,  'Add-on Bundle',                 NOW() - INTERVAL '6 days');

-- ---------------------------------------------------------------------
-- SEGMENTS - rule-based groups
-- ---------------------------------------------------------------------
INSERT INTO segments (name, description, rule_type) VALUES
('High Spenders',  'Customers who have spent over ₹30,000',           'high_spenders'),
('Active Users',   'Customers active in the last 7 days',             'active_users'),
('Inactive Users', 'Customers inactive for more than 30 days',        'inactive_users');

-- Segment memberships (computed based on rules)
-- High Spenders (total_spent > 30000)
INSERT INTO segment_members (segment_id, customer_id)
SELECT 1, id FROM customers WHERE total_spent > 30000;

-- Active Users (last_seen_at within 7 days)
INSERT INTO segment_members (segment_id, customer_id)
SELECT 2, id FROM customers WHERE last_seen_at > NOW() - INTERVAL '7 days';

-- Inactive Users (last_seen_at older than 30 days)
INSERT INTO segment_members (segment_id, customer_id)
SELECT 3, id FROM customers WHERE last_seen_at < NOW() - INTERVAL '30 days';

-- ---------------------------------------------------------------------
-- CONSENTS - sample consent records
-- ---------------------------------------------------------------------
INSERT INTO consents (customer_id, purpose, granted) VALUES
(1, 'analytics', true),  (1, 'marketing', true),
(2, 'analytics', true),  (2, 'marketing', false),
(3, 'analytics', true),  (3, 'marketing', true),
(4, 'analytics', true),  (4, 'marketing', true),
(5, 'analytics', true),  (5, 'marketing', false),
(6, 'analytics', true),  (6, 'marketing', true),
(7, 'analytics', false), (7, 'marketing', false),
(8, 'analytics', true),  (8, 'marketing', true),
(9, 'analytics', true),  (9, 'marketing', false),
(10,'analytics', true),  (10,'marketing', true),
(11,'analytics', true),  (11,'marketing', true),
(12,'analytics', true),  (12,'marketing', true),
(13,'analytics', false), (13,'marketing', false),
(14,'analytics', true),  (14,'marketing', false),
(15,'analytics', true),  (15,'marketing', true),
(16,'analytics', true),  (16,'marketing', true),
(17,'analytics', true),  (17,'marketing', true),
(18,'analytics', true),  (18,'marketing', false),
(19,'analytics', false), (19,'marketing', false),
(20,'analytics', true),  (20,'marketing', true);
