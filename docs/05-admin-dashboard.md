# 5. Admin Dashboard (Project 3)

> **Demo on sample data.** The dashboard runs entirely in the browser, like the website. It lives in the same codebase (`src/admin/`, entry `admin/index.html`) and is served at **`/admin/`** next to the website. Bookings sent from the website in the same browser appear in the dashboard, and staff decisions (confirm, decline, cancel…) show on the customer's "My bookings" page.

## What it covers (from the brief)

| Brief item | Where |
|---|---|
| Booking operations | **Bookings** (search, filters, CSV export), **Booking detail** (confirm / decline / complete / approve or decline cancellation, handle change requests, internal notes, history), **Overview** "Needs action" queue |
| Events | **Event calendar** (month view, events per day) and "Coming up this week" |
| Services & categories | **Services** (packages, prices, add-ons, cities, occasions, visibility, featured), **Categories** (names, order, visibility) |
| Providers | **Providers** (contact, cities, commission, status, booked revenue, rating) |
| Customers | **Customers** (search, tags VIP/Corporate, block, notes, booking history and value) |
| Pricing configuration | **Pricing & policies** (VAT, travel fee per city, lead time, cancellation/change windows, default commission) with a live price example |
| Promotions | **Promotions** (percentage or fixed codes, dates, limits, categories, state) |
| Reports | **Reports** (revenue incl./excl. VAT, commission, average booking, cancellation rate, by month / category / city / occasion / service / channel, CSV) |
| Permissions | **Staff & permissions** (staff accounts, roles, permission matrix, activity log) |

## Roles

| Permission | Administrator | Operations | Finance | Viewer |
|---|:-:|:-:|:-:|:-:|
| View all pages | ✓ | ✓ | ✓ | ✓ |
| Manage bookings | ✓ | ✓ | | |
| Edit services & categories | ✓ | ✓ | | |
| Manage providers | ✓ | ✓ | | |
| Manage customers | ✓ | ✓ | | |
| Change pricing & policies | ✓ | | ✓ | |
| Manage promotions | ✓ | | ✓ | |
| Export reports | ✓ | | ✓ | |
| Manage staff & roles | ✓ | | | |

Source of truth: `src/admin/auth/roles.ts`. **Project 2 must enforce the same matrix on the server**; the demo only hides controls.

## Booking actions (staff)

| Action | From | To | Customer sees (history key) |
|---|---|---|---|
| `start_review` | pending_request | pending_confirmation | `history.staffReviewing` |
| `confirm` | pending_request, pending_confirmation | confirmed | `history.staffConfirmed` (review step added if skipped) |
| `reject` (note required) | pending_request, pending_confirmation | cancelled | `history.staffRejected` |
| `complete` (event date reached) | confirmed | completed | `history.staffCompleted` |
| `approve_cancellation` (note required) | cancellation_requested | cancelled | `history.staffCancellationApproved` |
| `decline_cancellation` (note required) | cancellation_requested | confirmed | `history.staffCancellationDeclined` |

Consistent with `BOOKING_TRANSITIONS` in `src/utils/booking-lifecycle.ts`. Definitions: `src/admin/utils/booking-actions.ts`.

## Proposed admin API (for Project 2)

Same conventions as `docs/03-api-contract.md` (JSON, `{ar,en}` texts, SAR decimals, error shape). Base `/api/v1/admin`, staff session required. TypeScript shapes: `src/admin/models.ts`. The dashboard calls these through `src/admin/api/http-admin-client.ts` when `VITE_API_MODE=http`; the demo uses `mock-admin-client.ts` with the same `AdminApiClient` interface.

| Method & path | Body / query | Returns | Permission |
|---|---|---|---|
| `GET /dashboard` | | `DashboardSummary` | any staff |
| `GET /bookings` | `q,status(needs_action),cityId,categoryId,providerId,customerId,from,to,sort,page,pageSize` | `{items: AdminBooking[], total}` | any staff |
| `GET /bookings/{id}` | | `AdminBooking` | any staff |
| `POST /bookings/{id}/transitions` | `{action, note?}` | `AdminBooking` · `409 TRANSITION_NOT_ALLOWED` | bookings.manage |
| `POST /bookings/{id}/modification-request/resolve` | `{note?}` | `AdminBooking` | bookings.manage |
| `POST /bookings/{id}/notes` | `{text}` | `AdminBooking` | bookings.manage |
| `GET /services`, `GET /services/{id}` | | `AdminService[]`, `AdminService` | any staff |
| `PATCH /services/{id}` | partial `AdminService` | `AdminService` (startingPrice/duration recomputed) | catalog.manage |
| `GET /categories`, `PUT /categories/{id}` | `AdminCategory` | | catalog.manage (write) |
| `GET /providers`, `PUT /providers/{id}` | `Provider` | `ProviderWithStats[]` / `Provider` | providers.manage (write) |
| `GET /customers`, `GET /customers/{id}`, `PATCH /customers/{id}` | `q,tag,page,pageSize` / partial `Customer` | `CustomerWithStats` | customers.manage (write) |
| `GET /pricing`, `PUT /pricing` | `PricingSettings` | `PricingSettings` | pricing.manage (write) |
| `GET /promotions`, `PUT /promotions/{id}`, `DELETE /promotions/{id}` | `Promotion` | · `409 CONFLICT` on duplicate code | promotions.manage (write) |
| `GET /reports/summary` | `from,to` (event dates) | `ReportData` | any staff (export: reports.view) |
| `GET /staff`, `PUT /staff/{id}` | `StaffUser` | | staff.manage (write) |
| `GET /audit-log` | `limit` | `AuditEntry[]` | any staff |

Server rules to carry over from the demo:
- Revenue counts `confirmed`, `completed` and `cancellation_requested` bookings, by **event date**. Commission = (subtotal − discount) × provider rate.
- Every write is recorded in the audit log with the staff member.
- Website reads services, categories, cities' travel fees and policies from the same tables, so dashboard changes reach the site automatically (in the demo they stay in the dashboard).
- Promotion codes are unique (case-insensitive) and will be applied by `POST /bookings` once the website accepts codes.

## Demo notes

- Sign-in is a sample-account picker (no password). Try **Lujain (Finance)** or **Reem (Viewer, disabled)** to see permissions.
- Sample data is generated once per browser from a fixed seed with dates relative to today (`src/admin/data/seed.ts`). "Reset demo data" in the sidebar restores it; website bookings are kept.
- Storage keys: `farha.demo.admin.v1` (dashboard), `farha.demo.bookings.v1` (website bookings, shared).
- One-file build of the dashboard: `npm run build:admin-demo` → `dist-admin-demo/admin/index.html`.
