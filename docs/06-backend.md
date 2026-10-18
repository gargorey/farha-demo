# 6. Backend (Project 2)

The backend serves the customer website (`/api/v1`) and the admin dashboard (`/api/v1/admin`) from one PostgreSQL database. It implements the contracts in [03-api-contract.md](03-api-contract.md) and [05-admin-dashboard.md](05-admin-dashboard.md), so both apps switch over with `VITE_API_MODE=http` and no page changes.

**Stack:** Node.js 22 + TypeScript, Fastify 5, PostgreSQL 16 (`pg`, plain SQL migrations), Zod validation. Code in `server/`. Pricing, catalogue search, booking rules, dashboard and report maths are **shared with the frontend** (`src/utils`, `src/admin/utils/analytics.ts`), so the website's estimate, the demo and the server always agree.

## Run it locally

```bash
npm install
cp server/.env.example server/.env        # set DATABASE_URL (any PostgreSQL 14+)
npm run db:seed -- --sample               # schema + catalogue + sample bookings/staff (dev password: farha-dev-password)
npm run server:dev                        # API on http://localhost:8080
VITE_API_MODE=http npm run dev            # website :5173, dashboard :5173/admin/
```

Or as one production-style process that also serves the built apps:
```bash
VITE_API_MODE=http VITE_API_BASE_URL=/api/v1 npm run build && npm run server:build
SERVE_STATIC_DIR=dist node --env-file=server/.env dist-server/index.js   # http://localhost:8080 and /admin/
```
`Dockerfile` does the same in a container. Migrations run automatically on start.

| Command | |
|---|---|
| `npm run db:migrate` | Apply schema changes |
| `npm run db:seed` | Starting catalogue only (for a live site) |
| `npm run db:seed -- --sample` | Plus sample customers, 150 bookings, promotions, staff (demo/dev; refused in production unless `ALLOW_SAMPLE_DATA=true`) |
| `npm run db:create-admin -- --email you@company.sa --name "Name"` | First administrator; prints a one-time password |
| `npm run server:test` | 41 API tests against a real PostgreSQL (`DATABASE_URL_TEST`) |

Configuration: `server/.env.example` (every variable explained). Nothing secret is committed; in production the server refuses to start without a 32+ character `APP_SECRET`.

## Security and data protection

| Area | What the server does |
|---|---|
| Staff sign-in | E-mail + password hashed with scrypt; 12+ character passwords; same error for unknown e-mail and wrong password; account locked 15 min after 5 failures; 10 attempts / 15 min per IP. New and reset accounts get a one-time password and must choose their own before doing anything. |
| Staff sessions | Random token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie; only its SHA-256 hash is stored. Ends after 2 h idle / 12 h total, on sign-out, when the account is disabled or its role changes, and (other devices) on password change. |
| Permissions | Every admin endpoint checks the role matrix from `src/admin/auth/roles.ts` on the server. Nobody can change their own role or disable themselves; at least one active administrator always remains. |
| Customers | Bookings made in a browser are visible in that browser (session cookie). To see bookings from another device the customer verifies their mobile with a 6-digit SMS code (HMAC-hashed, 5 min, 5 tries, 3 codes / 15 min per number). A booking someone else made is answered with "not found". |
| Bookings | Everything re-validated; price recomputed on the server (the client cannot send one); idempotency key prevents duplicates; a per-service/day lock stops two people taking the same slot; blocked customers cannot book. |
| Input | Strict schemas: unknown fields are rejected (no mass assignment), lengths capped, control characters stripped, SQL always parameterised, LIKE wildcards escaped, 256 KB body limit. |
| Browser | CORS allow-list, Origin check on every write (CSRF), CSP/HSTS/frame-blocking headers (Helmet), `Cache-Control: no-store` on API answers, rate limits (global and per sensitive route). |
| Logs & audit | No cookies, bodies or query strings in logs; phone numbers masked. Every staff change and sign-in goes to the audit log with who did it. |
| Personal data (PDPL) | Only what a booking needs; customer contact details cannot be edited by staff; staff notes never reach customers; internal ids and provider records are not exposed to the website. |

Still to do before real customers: choose an SMS provider (only a development sender exists; `DEMO_MODE=true` shows codes on screen for demos), two-step verification for staff, database backups/encryption at rest (a hosting setting), data-retention and deletion requests, payment integration, e-mail/WhatsApp notifications.

## Hosting (decision needed)

GitHub Pages can only host the browser demo. The backend needs a Node.js host and a managed PostgreSQL database. Recommended: one container (this `Dockerfile`) serving the API, website and dashboard on one domain, so cookies stay first-party. Options: Render, Railway or Fly.io (simple), or AWS/GCP/Azure (Bahrain/Dammam/Doha regions keep data in the Gulf, relevant for PDPL). Set `DATABASE_URL`, `APP_SECRET`, `ALLOWED_ORIGINS`, `TRUST_PROXY=true`, then run `db:seed` and `db:create-admin` once.

## Data model

`settings` (one row: VAT, travel fees, policy windows) · `cities` · `event_types` · `categories` · `providers` · `services` (catalogue as JSON + key columns) · `customers` (unique phone) · `bookings` (status, dates, totals as columns; selection, pricing and history as JSON) · `idempotency_keys` · `promotions` · `staff_users` · `staff_sessions` · `customer_sessions` · `otp_challenges` · `audit_log` · `contact_messages`. Schema: `server/src/db/migrations.ts`.

## API additions beyond the earlier contract

- `GET /settings`: public business rules (VAT, lead time, windows) so the website's estimates match the server.
- Customer sign-in: `POST /auth/otp/request {phone}`, `POST /auth/otp/verify {phone, code}`, `GET /auth/session`, `POST /auth/logout`.
- Staff: `POST /admin/auth/login`, `GET /admin/auth/me`, `POST /admin/auth/logout`, `POST /admin/auth/password`, `POST /admin/staff/{id}/reset-password`. Creating a staff member returns `temporaryPassword` once.
- Error codes `UNAUTHORIZED` 401, `FORBIDDEN` 403, `RATE_LIMITED` 429.
- Availability comes from real bookings (a slot is taken when another open booking of the same service overlaps it, plus a 60-minute buffer) until providers manage their own calendars.
