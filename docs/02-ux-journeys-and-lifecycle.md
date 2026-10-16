# 2. UX, Customer Journeys and Booking Lifecycle

## 2.1 Sitemap

```
/                         Home
/services                 Catalogue (search, filters, sort; state in URL)
/services/:slug           Service details
/plan                     Plan my event (guided discovery)
/book/:slug[?package=]    Booking flow (5 steps)
/booking/confirmation/:id Confirmation
/bookings                 My bookings (demo session)
/bookings/:id             Booking details, change/cancel requests
/about  /contact  /faq    Content pages
*                         404
```
Header: logo, Home, Services, Plan my event, My bookings, About, Contact, language switcher, "Book entertainment" CTA. Footer: categories, company, help.

## 2.2 Main journeys

**J1 — Search-led (most common)**
Home → hero search (category/event/date/city) → Catalogue with filters pre-applied → Service details → choose package → Booking (event details pre-filled from the search) → Review → Confirmation → Booking details.

**J2 — Guided planning**
Plan my event → answer optional questions (event, date, city, guests, audience, budget, style, duration) → ranked suggestions with "why it fits" reasons → "Book with these details".

**J3 — Track and manage**
My bookings → open booking → see status timeline → request a change or cancellation (policy-driven) → status updates.

**J4 — Help**
FAQ & policies → Contact form (validated; demo message reference).

## 2.3 Booking flow steps

| Step | Collects | Rules |
|---|---|---|
| 1 Package | Package | Required; skipped when chosen on the details page |
| 2 Event | Event type, date, start time, extra hours, city, venue, attendees, notes | Event type and city limited to those the service supports; date ≥ today + 2 days and ≤ 180 days; availability checked; unavailable dates blocked; capacity warning |
| 3 Customise | Add-ons and quantities | Optional; price updates instantly |
| 4 Contact | Full name, Saudi mobile, email, preferred contact method | Mobile accepts 05…, 5…, +966…, Arabic digits; normalised to E.164 |
| 5 Review | Explicit confirmation checkbox | Full summary with edit links and price breakdown; submit disabled while sending; idempotency key prevents duplicates |

Form data is kept in `sessionStorage` per service, so going back or refreshing never loses input; it is cleared after a successful submission.

## 2.4 Booking lifecycle

```
draft ──submit──▶ pending_request ──system──▶ pending_confirmation ──provider──▶ confirmed ──system──▶ completed
                     │                             │                                │
                     └──customer withdraw──▶ cancelled ◀──customer/provider──┘       └──customer──▶ cancellation_requested
                                                  ▲                                                     │
                                                  └───────────────provider approves─────────────────────┘
                                                                     (provider rejects → back to confirmed)
```

| From | To | Actor | Needs backend? |
|---|---|---|---|
| draft | pending_request | customer (submit) | yes (create) |
| pending_request | pending_confirmation | system (provider notified) | **yes** |
| pending_request / pending_confirmation | cancelled | customer (withdraw) | yes |
| pending_confirmation | confirmed / cancelled | provider | **yes (Project 3 / provider tools)** |
| confirmed | cancellation_requested | customer (≥ 48 h before) | yes |
| cancellation_requested | cancelled / confirmed | provider/admin | **yes** |
| confirmed | completed | system after event | **yes** |

Source of truth: `src/utils/booking-lifecycle.ts`. In the demo, provider/system steps are triggered by a clearly labelled **"Demo controls"** panel on the booking details page.

**Change requests** don't change status: they are recorded on the booking (`modificationRequest`) and in the history until a provider acts (Project 2/3).

## 2.5 Visual system

- Palette: deep plum (brand), warm gold (accent/CTA), coral (alerts), mint (success), sand neutrals.
- Type: IBM Plex Sans Arabic (Arabic), Plus Jakarta Sans (Latin).
- Radius 12–28 px, soft layered shadows, subtle fade/pop/float motion (disabled with reduced-motion).
- Imagery: bundled vector illustrations per category (never broken). Real photography can be added per service via `media[].url`; the illustration remains the fallback.
