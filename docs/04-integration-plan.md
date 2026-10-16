# 4. Integration Plan for Projects 2 and 3

## What is already in place (Project 1)

- `ApiClient` interface (`src/services/api/client.ts`) — the only thing pages depend on.
- `createHttpClient` (REST, untested against a server) and `createMockClient` (in-browser demo).
- Switch with `VITE_API_MODE=http` + `VITE_API_BASE_URL`.
- Typed models (`src/models`) matching the contract in `03-api-contract.md`.
- Business rules isolated in `src/config/business.ts`, `src/utils/pricing.ts`, `src/utils/booking-lifecycle.ts` — the backend should implement the same rules and become authoritative.

## Project 2 — Backend API (recommended order)

1. **Catalogue read APIs** (services, categories, event types, cities) seeded from `src/services/mock/*.ts` → switch the website to `http` mode for browsing.
2. **Bookings create/read** with idempotency, server-side validation and pricing (port `pricing.ts` logic; add tests using the same cases as `pricing.test.ts`).
3. **Customer identity**: phone OTP (recommended for KSA) → `GET /bookings` per customer; replace the demo localStorage session.
4. **Availability**: provider calendars, holds, `GET /services/{id}/availability`.
5. **Lifecycle transitions** + audit history; change and cancellation requests with configurable windows.
6. **Notifications**: email/SMS/WhatsApp on status changes.
7. **Payments** (after the workflow is approved): deposit or full payment, refunds per policy.
8. Non-functional: PDPL-compliant storage of personal data, rate limiting, logging, backups, Arabic full-text search.

Frontend changes needed then: remove the "Demo controls" panel (only shown when `api.isDemo`), add OTP login screens, and drop the browser booking store. Pages and components need no rewrite.

## Project 3 — Admin Dashboard

Separate app on the same backend:
- Services, packages, add-ons, categories (with Arabic/English fields) — the catalogue becomes data-driven, no code changes for new categories.
- Providers (profiles, cities served, verification status, calendars).
- Bookings queue: confirm/reject, complete, approve/reject cancellation, handle change requests.
- Customers, pricing config (VAT mode, travel fees, discounts), promotions, reports, roles & permissions.

## Decisions needed before Project 2 starts
See "Open decisions" in `01-business-analysis.md` §1.12 — especially VAT display, deposits, cancellation/refund policy and launch cities.
