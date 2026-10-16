# 1. Business & Product Analysis — Farha (Project 1)

> Working brand name **"Farha / فرحة"** is a placeholder chosen for the demo. It is set in `src/config/business.ts` and the translation files and can be renamed in minutes.

## 1.1 Vision and objectives

**Vision.** The easiest way in Saudi Arabia to find, compare and book trustworthy entertainment for any celebration — in Arabic and English.

**Objectives (first release)**
1. Let a customer go from "I have an event" to a submitted booking request in under 5 minutes.
2. Make price and what's included completely transparent before submission.
3. Capture structured, complete booking requests so providers can confirm quickly (fewer back-and-forth calls).
4. Prove the customer journey with a client-ready demo before investing in backend and admin (Projects 2 and 3).

## 1.2 Target customers and personas

| Persona | Who | Needs | Typical booking |
|---|---|---|---|
| **Umm Fahad – the parent host** | Mother planning a child's birthday at home, mobile-first, Arabic | Kid-safe performers, clear price, quick WhatsApp contact | Clown or magician, 20–30 kids, Riyadh/Jeddah |
| **Reem – the wedding planner** | Family member or planner organising a wedding/engagement | Elegant acts, kids-corner entertainment, reliability | Bubble show, LED show, host |
| **Faisal – the HR/events coordinator** | Corporate employee running family days and galas | Bilingual host, large-capacity shows, formal quotes, VAT shown | Grand illusion show, games day, host |
| **Ms. Noura – the school activity lead** | School events officer | Educational content, age suitability, school-day timing | Science show, puppet theatre, National Day show |
| **Festival organiser** | Municipality / mall marketing | Multi-slot day packages, crowd capacity | Circus duo festival day, National Day show |

## 1.3 Customer problems → solutions

| Problem today | Solution in the platform |
|---|---|
| Finding performers relies on Instagram/WhatsApp word of mouth | Searchable catalogue by category, event type, city, price, duration |
| Prices are unclear until after several messages | Packages with fixed prices; add-ons, travel fee and VAT itemised live |
| Unsure whether a performer suits the age group / venue | Age suitability, requirements, capacity and "suitable for" on every service |
| No record of what was agreed | Booking reference, full request summary and status history |
| Changing or cancelling is awkward | Self-service change/cancellation requests governed by a visible policy |
| Arabic-only or English-only sites | Full Arabic (RTL, default) and English (LTR) |

## 1.4 Business model (to be approved)

- **Primary:** commission per *completed* booking (e.g. 10–20% — *not decided*).
- **Secondary options:** featured placement for providers, subscription tiers for providers, corporate/event-management packages, seasonal campaigns (National Day, Eid, school year).
- **Payments:** none in Project 1. A gateway (mada, Apple Pay, cards) is recommended after the booking workflow is approved.

## 1.5 Functional requirements (Project 1)

| ID | Requirement | Status in demo |
|---|---|---|
| FR-01 | Bilingual UI (Arabic default, English), RTL/LTR, visible switcher | Done |
| FR-02 | Home page with search (category, event type, date, city) | Done |
| FR-03 | Catalogue with keyword search, filters (category, event type, city, price, duration), sorting, active-filter chips, reset, empty state | Done |
| FR-04 | Service details: gallery, description, included, duration, event types, age, areas, packages, add-ons, requirements, reviews, FAQs, similar services, CTA | Done |
| FR-05 | Event planner that recommends services from event inputs | Done (transparent rule-based scoring) |
| FR-06 | 5-step booking flow (package → event → customise → contact → review) with validation and live pricing | Done |
| FR-07 | Simulated submission, demo reference, confirmation page | Done |
| FR-08 | My bookings + booking details, change/cancellation requests | Done (demo session in browser) |
| FR-09 | About, Contact (validated form), FAQ & policies | Done |
| FR-10 | 404, loading, empty, error, submission-error states | Done |
| FR-11 | Service/API abstraction switchable to a real backend | Done (`VITE_API_MODE`) |

## 1.6 Non-functional requirements

- **Performance:** route-level code splitting; vendor chunks; no external image requests (bundled vector illustrations).
- **Accessibility:** semantic HTML, labelled form controls, `aria-invalid`/`aria-describedby`, live regions for availability and results, keyboard-usable dialogs (`<dialog>`), skip link, reduced-motion support.
- **Localisation:** organised dictionaries, Arabic plural forms, locale-aware currency (SAR), numbers, dates (Gregorian) and times; LTR isolation for phones/emails/references.
- **Responsiveness:** tested at 375 px, 390 px and 1366 px; no horizontal scrolling.
- **Security & privacy:** no secrets in the frontend; demo data in browser storage is explicitly *not* production-grade; minimal personal data stored.
- **Maintainability:** typed domain models, single pricing engine, single lifecycle module, config-driven policies.

## 1.7 MVP scope vs. future enhancements

**MVP (Project 1 + minimal Project 2):** catalogue, details, planner, booking request, guest checkout, booking tracking, change/cancel requests, contact.

**Future:** customer accounts & OTP login, online payment & deposits, real-time availability calendars, provider profiles & portfolios, verified reviews after completed events, promo codes, WhatsApp/SMS/email notifications, quotes for corporate customers, multi-service "event bundles", Hijri date display, provider app.

## 1.8 Pricing model

`total = package price + Σ(add-on price × qty) + extra hours × hourly rate + city travel fee − discounts + VAT`

- Packages are fixed price per service; add-ons optional, some quantifiable (capped).
- Extra hours allowed only up to the service's `maxExtraHours`.
- Travel fee configured per city (0 in major cities in demo data).
- **VAT 15%** shown as a separate line (`pricesIncludeVat: false`). *Assumption — needs approval.*
- No discounts configured; the engine supports percentage codes when approved.
- The frontend total is labelled **"estimated"**; the backend must recompute and is authoritative.

All in `src/utils/pricing.ts` and `src/config/business.ts`.

## 1.9 Policies (illustrative, configurable — NOT approved)

| Policy | Demo value | Where |
|---|---|---|
| Minimum lead time | 2 days | `booking.minLeadDays` |
| Booking horizon | 180 days | `booking.maxAdvanceDays` |
| Verified availability window | 60 days (beyond → "not verified") | `booking.verifiedAvailabilityDays` |
| Withdraw before provider confirms | Always allowed, immediate | `policy.freeWithdrawalBeforeConfirmation` |
| Cancellation request after confirmation | Up to 48 h before event | `policy.cancellationCutoffHours` |
| Change request | Up to 72 h before event | `policy.modificationCutoffHours` |
| Refunds | Not defined; shown as pending | FAQ |
| Commission | Not defined | — |
| Provider verification | Not defined | — |

## 1.10 Availability and scheduling rules

- A date is **available**, **limited**, **unavailable** or **not verified**. Only provider/backend confirmation guarantees a date.
- Unavailable dates cannot be submitted; unverified dates can (provider confirms later).
- Demo availability is generated deterministically per service/date (Thu/Fri busier). It is *not* a real calendar.
- Start-time options come from availability slots, else default slots.

## 1.11 Data entities and relationships

```
ServiceCategory 1──* Service *──* EventType
Service *──* City (service areas, travel fee on City)
Service 1──* ServicePackage
Service 1──* ServiceAddOn
Service 1──* Review            (future: Review *──1 Booking, verified)
Service *──1 Provider          (demo: providerName only)
Booking *──1 Service, *──1 ServicePackage, *──* ServiceAddOn (qty)
Booking 1──1 EventDetails, 1──1 CustomerDetails, 1──1 PricingBreakdown
Booking 1──* BookingHistoryEntry (status audit trail)
Customer 1──* Booking          (future, with accounts)
```
Types: `src/models/*.ts`.

## 1.12 Risks, assumptions and open decisions

**Assumptions:** guest booking (no accounts); request-then-confirm model; VAT shown separately; Gregorian dates; SAR only; providers serve fixed city lists; demo content is fictional.

**Risks**
- Provider responsiveness determines customer trust → SLA for confirmation needed.
- Double-booking without a real availability system → Project 2 must own availability.
- Licensed characters (IP) → demo uses generic, non-licensed characters only.
- Personal data (PDPL compliance) → backend storage, consent and retention policy required.
- Pricing disputes if on-site requirements are missed → requirements shown before booking; confirmed by provider.

**Open decisions for the business:** brand name; commission %; whether prices include VAT; deposit/payment timing; cancellation & refund rules; provider vetting process; supported cities at launch; notification channels; whether to show provider names publicly.
