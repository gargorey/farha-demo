# 3. Proposed REST API Contract (for Project 2)

> **Implemented in `server/` (see [06-backend.md](06-backend.md)).** The frontend calls these through `src/services/api/http-client.ts` when `VITE_API_MODE=http`. In the demo, `src/services/mock/mock-client.ts` implements the same `ApiClient` interface in the browser. TypeScript shapes: `src/models/`.

## Conventions

- Base URL: `/api/v1`. JSON, UTF-8. Money in SAR as decimal numbers.
- Localised fields are returned as `{ "ar": "...", "en": "..." }`; the client chooses. `Accept-Language: ar|en` is sent for server messages.
- Dates `YYYY-MM-DD` (Gregorian, Asia/Riyadh), times `HH:mm`, timestamps ISO-8601 UTC.
- Phones in E.164 (`+9665XXXXXXXX`).
- `POST /bookings` requires an `Idempotency-Key` header.
- Errors:
```json
{ "code": "VALIDATION_ERROR", "message": "Invalid booking",
  "fieldErrors": [{ "field": "cityId", "messageKey": "validation.cityNotServed" }] }
```
  Codes: `NETWORK_ERROR` (client only), `NOT_FOUND` 404, `VALIDATION_ERROR` 422, `CONFLICT` 409, `DATE_UNAVAILABLE` 409, `TRANSITION_NOT_ALLOWED` 409, `POLICY_WINDOW_CLOSED` 409, `UNKNOWN` 500.

## Catalogue

### `GET /api/v1/services`
Query: `q`, `categoryIds` (comma list), `eventTypeId`, `cityId`, `minPrice`, `maxPrice`, `minDurationMinutes`, `maxDurationMinutes`, `audience`, `style`, `attendees`, `sort` (`relevance|price-asc|price-desc|popularity|rating`).
```json
{ "items": [ {
    "id": "svc-clown-bobo", "slug": "bobo-the-clown", "categoryId": "cat-clowns",
    "name": { "ar": "المهرج بوبو", "en": "Bobo the Clown" },
    "shortDescription": { "ar": "…", "en": "…" },
    "media": [{ "url": "https://cdn…/bobo-1.jpg", "motif": "clown", "alt": { "ar": "…", "en": "…" } }],
    "startingPrice": 900, "durationMinutes": 60, "rating": 4.7, "reviewCount": 3,
    "eventTypeIds": ["birthday","kids-party"], "cityIds": ["riyadh","jeddah"], "featured": true
  } ], "total": 1 }
```

### `GET /api/v1/services/{idOrSlug}`
Full `Service`: adds `description`, `providerName`, `packages[]`, `addOns[]`, `extraHourPrice`, `maxExtraHours`, `audience`, `ageRange`, `styles`, `requirements[]`, `reviews[]`, `faqs[]`.
```json
{ "packages": [{ "id": "party", "name": {"ar":"باقة الحفلة","en":"Party"}, "price": 900,
                 "durationMinutes": 60, "maxAttendees": 25, "includes": [{"ar":"…","en":"…"}], "popular": true }],
  "addOns": [{ "id": "face", "name": {"ar":"رسم على الوجه","en":"Face painting"}, "price": 350,
               "quantifiable": false, "maxQuantity": 1 }] }
```

### `GET /api/v1/categories` → `ServiceCategory[]`
### `GET /api/v1/event-types` → `EventType[]` *(added; needed by filters)*
### `GET /api/v1/cities` → `City[]` (includes `travelFee`)

### `GET /api/v1/services/{id}/availability?from=2026-10-20&to=2026-11-02&cityId=riyadh`
```json
[ { "date": "2026-10-20", "state": "available", "slots": ["16:00","18:00","20:00"] },
  { "date": "2026-10-23", "state": "unavailable", "slots": [] },
  { "date": "2027-01-10", "state": "unverified", "slots": ["10:00","16:00"] } ]
```
`state`: `available | limited | unavailable | unverified`.

## Bookings

### `POST /api/v1/bookings`
Headers: `Idempotency-Key: 4b1c…` (same key ⇒ same booking returned, never a duplicate).
```json
{ "selection": { "serviceId": "svc-clown-bobo", "packageId": "party",
                 "addOns": [{ "addOnId": "face", "quantity": 1 }] },
  "event": { "eventTypeId": "birthday", "date": "2026-10-20", "startTime": "17:00", "extraHours": 0,
             "cityId": "riyadh", "venue": "Home – Al Malqa", "attendees": 20, "notes": "Theme: space" },
  "customer": { "fullName": "Sara Alqahtani", "phone": "+966551234567",
                "email": "sara@example.com", "contactMethod": "whatsapp" } }
```
`201 Created`
```json
{ "id": "6f0c…", "reference": "FR-7KQ2MX", "status": "pending_request",
  "selection": { … }, "event": { … }, "customer": { … },
  "pricing": { "currency": "SAR",
    "lines": [ { "kind": "package", "labelKey": "pricing.package", "labelParams": {"id":"party"}, "amount": 900 },
               { "kind": "addon", "labelKey": "pricing.addon", "labelParams": {"id":"face"}, "quantity": 1, "unitPrice": 350, "amount": 350 },
               { "kind": "vat", "labelKey": "pricing.vat", "labelParams": {"rate": 15}, "amount": 187.5 } ],
    "subtotal": 1250, "discountTotal": 0, "vat": 187.5, "vatRate": 0.15, "total": 1437.5, "isEstimate": true },
  "createdAt": "2026-10-14T10:30:00Z", "updatedAt": "2026-10-14T10:30:00Z",
  "history": [{ "at": "2026-10-14T10:30:00Z", "status": "pending_request", "noteKey": "history.submitted" }] }
```
Server must: re-validate everything, **recompute pricing** (client total is an estimate), check availability (409 `DATE_UNAVAILABLE`), and place a provisional hold if desired.

### `GET /api/v1/bookings/{id}` → `Booking`
Authorisation: owner (customer session/OTP) or staff.

### `GET /api/v1/bookings` → `{ "items": Booking[] }`
For the authenticated customer. (Demo: all bookings in this browser.)

### `PATCH /api/v1/bookings/{id}`
Change request (does not change status until the provider accepts):
```json
{ "modificationRequest": { "message": "Move start time to 18:00 and add 5 guests" } }
```
`200` → updated `Booking`. `409 POLICY_WINDOW_CLOSED` inside 72 h (configurable).

### `POST /api/v1/bookings/{id}/cancellation-requests`
```json
{ "reason": "Event postponed" }
```
- Before confirmation → status `cancelled` (withdrawal).
- After confirmation → status `cancellation_requested` (provider/admin decides).
- `409 POLICY_WINDOW_CLOSED` inside 48 h, `409 TRANSITION_NOT_ALLOWED` for completed/cancelled.

## Other

### `POST /api/v1/contact-messages` *(added)*
```json
{ "name": "Sara", "email": "sara@example.com", "phone": "0551234567", "subject": "planning", "message": "…" }
```
`201` → `{ "id": "MSG-…" }`

## Endpoints Project 3 (admin) will add — not used by this website
`/admin/services`, `/admin/categories`, `/admin/providers`, `/admin/bookings/{id}/transitions` (confirm, reject, complete, approve cancellation), `/admin/pricing`, `/admin/promotions`, `/admin/reports`.
