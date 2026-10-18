# Farha — Event Entertainment Booking Website & Admin Dashboard (Projects 1 and 3 of 3)

Bilingual (Arabic default, English) customer website for discovering and booking entertainment for events in Saudi Arabia: magicians, clowns, mascot characters, bubble shows, hosts and more.

**This is a frontend demo.** All services, providers, reviews and bookings are fictional. No real booking, payment, notification or message is ever sent; this is stated in the UI wherever it matters.

**Admin dashboard (Project 3)** lives in the same codebase at `/admin/` (`admin/index.html`, `src/admin/`). It manages bookings, the event calendar, services, categories, providers, customers, pricing, promotions, reports and staff permissions, on sample data. See [docs/05-admin-dashboard.md](docs/05-admin-dashboard.md).

## Quick start

Requirements: Node.js 20+ (tested on 22).

```bash
npm install
npm run dev          # website: http://localhost:5173  ·  dashboard: http://localhost:5173/admin/
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript only |
| `npm run build:demo` / `npm run build:admin-demo` | One self-contained HTML file of the website / dashboard |

Static demo build that runs from any host or folder (hash routing, relative paths):
```bash
VITE_ROUTER_MODE=hash npm run build
```

## Configuration

Copy `.env.example` to `.env`:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock` = in-browser demo API, `http` = real backend (Project 2) |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | Backend URL when `http` |
| `VITE_MOCK_LATENCY_MS` | `450` | Simulated latency for the mock API |
| `VITE_ROUTER_MODE` | `browser` | `hash` for static hosting without rewrites |

Business rules (VAT, lead time, cancellation/change windows, contact details, brand name) are in `src/config/business.ts`. **All are assumptions pending business approval.**

Demo helpers:
- `?lang=en` or `?lang=ar` on any URL sets the language.
- `?simulate=booking-error` makes booking submissions fail (to show the error state); `?simulate=off` resets.
- "Load sample bookings" on the empty My bookings page; "Demo controls" on a booking simulate provider actions.

## Stack

React 19 + TypeScript + Vite, Tailwind CSS 4, React Router 7, i18next, React Hook Form + Zod, lucide icons, Vitest + Testing Library. No UI kit: a small in-house component set (`src/components/common`) keeps the bundle lean and RTL-correct.

## Structure

```
src/
  app/               App shell, providers, error boundary
  components/
    common/          Button, Field, Modal, Accordion, Illustration, states…
    layout/          Header, Footer, language switcher, demo banner
    services/        ServiceCard, CategoryCard
    booking/         PriceSummary, StatusBadge
  features/
    catalog/         URL-synced filters
    event-discovery/ Search context shared with booking
    booking/         Steps, schemas, draft state
    customer-bookings/
  pages/             One file per route
  routes/            Route table (code-split)
  services/
    api/             ApiClient interface, HTTP client, selector
    mock/            Demo data + mock API + browser booking store
  models/            Typed domain models
  hooks/  i18n/  utils/  config/  styles/
  admin/             Admin dashboard (Project 3): pages, layout, admin API + mock, sample data, roles
admin/index.html     Dashboard entry (served at /admin/)
docs/                Business analysis, journeys, API contract, integration plan, admin dashboard
```

## Client demo walkthrough (≈5 min)

1. Open the home page in **Arabic**; point out the RTL layout, then switch to **English** and back.
2. Use the hero search: *Clowns · Birthday · Riyadh* → catalogue opens with filters applied. Try sorting by price, add a price filter, remove chips.
3. Open **Bobo the Clown** (or *Sultan the Magician*): gallery, packages, add-ons, requirements, reviews, FAQs.
4. Choose a package → booking step 2: pick a green day from the availability strip, time, city, venue, guests.
5. Step 3: add *Face painting* and watch the price update. Step 4: name, `05x xxx xxxx`, email.
6. Step 5: review the full price breakdown (package, add-ons, travel fee where applicable, VAT 15%), tick the confirmation and submit.
7. Confirmation with **DEMO-FR-XXXXXX** reference → *View booking details* → use **Demo controls** to move it to *Awaiting confirmation* → *Confirmed*; then request a change or cancellation.
8. Refresh: the booking is still there (demo session). Repeat on a phone-sized screen.

## Completed features

Home (search, categories, popular, recommended, how it works, by occasion, benefits, testimonials, FAQ, CTA) · Catalogue with search/filters/sort/chips/empty state · Service details · Event planner with explained recommendations · 5-step booking with validation (Arabic/English messages), availability states, live pricing, back-navigation without data loss, duplicate-submission guard · Confirmation · My bookings + details with status history, change and cancellation requests · About · Contact (validated) · FAQ & policies · 404 / loading / error / empty states · Full Arabic/English with RTL/LTR · 38 automated tests.

## Known demo limitations

- No backend: data comes from `src/services/mock`; bookings are stored in this browser's `localStorage` (not secure, not shared across devices). Booking form drafts live in `sessionStorage` until submitted.
- Availability is generated, not real. Provider confirmation is simulated via Demo controls.
- No authentication, payments or notifications.
- Imagery is bundled vector artwork per category (no broken images, works offline). Real photos can be added via `media[].url` on each service.
- Native date picker follows the browser's language settings.
- Policies, VAT display, travel fees and prices are illustrative.
- `http-client.ts` follows the proposed contract but has not been run against a server.

## Documentation

- [Business & product analysis](docs/01-business-analysis.md)
- [UX, journeys & booking lifecycle](docs/02-ux-journeys-and-lifecycle.md)
- [Proposed API contract](docs/03-api-contract.md)
- [Integration plan for Projects 2 & 3](docs/04-integration-plan.md)
