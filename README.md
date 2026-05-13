# CDP Platform — Prototype

A clean, simple Customer Data Platform (CDP) prototype demonstrating the full CDP lifecycle: data collection → identity resolution → unified profiles → segmentation → analytics → consent management.

Built as an internal enterprise dashboard with a **red & white Airtel-inspired theme**.

## Tech Stack

| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| Frontend     | Next.js 14, React, Tailwind CSS, TypeScript |
| Backend      | Node.js, Express.js                         |
| Database     | PostgreSQL (single database for everything) |
| Auth         | JWT + Role-Based Access Control             |

## Project Structure

```
cdp-simple/
├── README.md                  ← you are here
├── database/
│   ├── schema.sql             PostgreSQL DDL (users, customers, events, segments…)
│   └── seed.sql               20 sample customers + segments + consents
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js           Express app entry point
│       ├── db/
│       │   └── postgres.js    PG connection pool
│       ├── middleware/
│       │   └── auth.js        JWT + RBAC middleware
│       ├── routes/
│       │   ├── auth.js        Login, /me
│       │   ├── events.js      Ingestion + identity resolution
│       │   ├── customers.js   Profiles list/detail
│       │   ├── segments.js    Segments CRUD + recompute
│       │   ├── analytics.js   KPIs, DAU, funnel
│       │   └── consents.js    Consent view/update
│       └── utils/
│           └── seed-events.js Generate sample events for demo
└── frontend/
    ├── package.json
    ├── .env.example
    └── src/
        ├── app/
        │   ├── login/         Login page
        │   ├── dashboard/     KPIs + charts + funnel
        │   ├── profiles/      Profile list + detail (360° view)
        │   ├── segments/      Segments list + members
        │   ├── analytics/     DAU, events, revenue, funnel
        │   └── consent/       Consent management
        ├── components/
        │   ├── sidebar.tsx
        │   └── auth-guard.tsx
        └── lib/
            ├── api.ts         Fetch wrapper
            └── format.ts      Date/number formatters
```

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **PostgreSQL** 14+ running on `localhost:5432`

That's it. No MongoDB, no Docker, no other services needed.

## Setup — Step by Step

### 1. Set up PostgreSQL

Create the database and run the schema + seed:

```bash
# Create the database (if it doesn't exist)
psql -U postgres -c "CREATE DATABASE cdp;"

# Apply schema
psql -U postgres -d cdp -f database/schema.sql

# Apply seed data (20 customers, 3 segments, 40 consent records)
psql -U postgres -d cdp -f database/seed.sql
```

> If your PostgreSQL user is not `postgres`, adjust accordingly. On Mac with Homebrew, the default user is your system username (no `-U` needed).

### 2. Configure & start the backend

```bash
cd backend
cp .env.example .env
# Edit .env if your DB credentials are different
npm install
npm run dev
```

You should see:
```
✓ PostgreSQL connected
✓ CDP Backend running on http://localhost:4000
```

### 3. Seed sample event data (recommended for charts)

In another terminal:
```bash
cd backend
npm run seed:events
```

This generates ~600 events spread over 14 days so the charts have realistic data.

### 4. Configure & start the frontend

In a third terminal:
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### 5. Open the app

Visit **http://localhost:3000** and log in:

| Email                      | Role         | Password    |
|----------------------------|--------------|-------------|
| `admin@cdp.local`          | admin        | password123 |
| `analyst@cdp.local`        | analyst      | password123 |
| `marketer@cdp.local`       | marketer     | password123 |
| `compliance@cdp.local`     | compliance   | password123 |

## Database Design

Everything lives in PostgreSQL — one database, seven tables:

| Table              | Purpose                                                |
|--------------------|--------------------------------------------------------|
| `users`            | Internal employees (admin/analyst/marketer/compliance) |
| `customers`        | Unified customer profiles                              |
| `events`           | Behavioral event log (with `properties` as JSONB)      |
| `purchases`        | Transaction records                                    |
| `segments`         | Rule-based customer groups                             |
| `segment_members`  | Customer ↔ segment membership                          |
| `consents`         | Per-purpose consent records (analytics, marketing)     |

The `events.properties` column is a **JSONB** field, which gives you the schema-flexibility benefits of a NoSQL store while keeping everything in one database. You can store `{ page: "/checkout" }` for one event and `{ amount: 4999, product_name: "Premium" }` for another.

## Authentication Flow

1. User submits email + password to `POST /api/auth/login`
2. Backend looks up user, compares bcrypt hash
3. On success, backend returns a **JWT** (24h expiry) and user info
4. Frontend stores JWT in `localStorage`
5. Every subsequent request includes `Authorization: Bearer <jwt>` header
6. The `requireAuth` middleware verifies the token and attaches `req.user`
7. Role-based middleware (`requireRole(...)`) restricts certain endpoints (e.g., consent updates require `admin` or `compliance`)

## Identity Resolution Logic

When an event arrives at `POST /api/events`, the backend tries to match it to an existing customer in this priority order:

1. **`user_id`** — strongest match (set after the user logs in)
2. **`email`** — falls back to email match
3. **`phone`** — falls back to phone match

If no match found, a new customer record is created. If a match is found on a weaker identifier (e.g., email but no `user_id` yet), the backend **backfills** the missing identifiers on the existing record.

This produces a single unified customer profile in PostgreSQL, even when events come from anonymous and authenticated sessions across web, mobile, etc.

## Sample API Calls

### Send an event (no auth required — would be from your SDK)
```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "purchase",
    "user_id": "u_001",
    "email": "rohan.kumar@example.com",
    "properties": { "amount": 4999, "product_name": "Premium Plan" }
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@cdp.local", "password": "password123" }'
```

### List customers (with auth)
```bash
curl http://localhost:4000/api/customers \
  -H "Authorization: Bearer YOUR_JWT_HERE"
```

## What This Prototype Demonstrates

| CDP Capability         | Implementation                                                    |
|------------------------|-------------------------------------------------------------------|
| **Data Collection**    | `POST /api/events` accepts `page_view`, `login`, `purchase`       |
| **Identity Resolution**| Match by `user_id` → `email` → `phone`, with backfill             |
| **Unified Profiles**   | One row per customer, joined to events via `customer_id`          |
| **Segmentation**       | Rule-based: High Spenders, Active Users, Inactive Users           |
| **Analytics**          | DAU, event volume, revenue trend, conversion funnel               |
| **Consent**            | Per-purpose (analytics/marketing) records with grant/revoke flow  |
| **RBAC**               | Admin / Analyst / Marketer / Compliance roles with permission gates |

## What It Does Not Include (intentionally)

- Docker / Kubernetes
- Microservices (it's a clean monolith)
- Kafka or any event streaming
- Probabilistic identity matching
- Production-scale partitioning, sharding, or caching
- Email/SMS/Ads activation destinations
- DSAR workflows
- Hash-chained audit logs

These were excluded to keep the prototype simple and focused on demonstrating the core CDP lifecycle.

## Troubleshooting

**"password authentication failed for user postgres"**
→ Update `PG_USER` and `PG_PASSWORD` in `backend/.env` to match your local PostgreSQL setup.

**Charts are empty**
→ Run `npm run seed:events` from the `backend/` directory.

**"Invalid credentials" when logging in**
→ Make sure you ran `database/seed.sql` after `database/schema.sql`. The password is `password123`.

**Port 3000 or 4000 already in use**
→ Change the `PORT` in `backend/.env` and update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` accordingly.
