import { z } from 'zod';
import { isValidISODate } from '@/utils/dates';
import { normalizeSaudiMobile } from '@/utils/phone';

/**
 * Request validation. Objects are strict: unknown fields are rejected, so callers
 * cannot set fields they are not meant to (ids, computed totals, statuses…).
 */

// Strip control characters (keeps newlines/tabs) from free text.
// eslint-disable-next-line no-control-regex
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
export const text = (max: number) => z.string().max(max).transform(clean);
export const requiredText = (max: number) => text(max).pipe(z.string().min(1));

export const id = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/, 'Invalid id');
export const isoDate = z.string().refine(isValidISODate, 'Invalid date');
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time');
export const email = z.string().trim().toLowerCase().max(254).email();
export const saudiMobile = z
  .string()
  .max(32)
  .transform((v, ctx) => {
    const n = normalizeSaudiMobile(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'validation.phone' });
    return n ?? '';
  });
// Provider/staff phones may be landlines: E.164-ish, digits only.
export const anyPhone = z.string().trim().max(20).regex(/^\+?[0-9 ]{6,20}$/, 'Invalid phone');
export const money = z.number().finite().min(0).max(1_000_000);
export const localized = (max: number) => z.object({ ar: text(max), en: text(max) }).strict();
export const localizedRequired = (max: number) => z.object({ ar: requiredText(max), en: requiredText(max) }).strict();
const motif = z.enum(['magic', 'clown', 'mascot', 'kids', 'interactive', 'bubbles', 'illusion', 'games', 'host', 'variety', 'science', 'puppets']);

// ---------- Customer website ----------

export const serviceQuery = z.object({
  q: text(100).optional(),
  categoryIds: z
    .string()
    .max(500)
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(id).max(20))
    .optional(),
  eventTypeId: id.optional(),
  cityId: id.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minDurationMinutes: z.coerce.number().int().min(0).optional(),
  maxDurationMinutes: z.coerce.number().int().min(0).optional(),
  audience: z.enum(['toddlers', 'kids', 'teens', 'adults', 'all']).optional(),
  style: z.enum(['calm', 'interactive', 'high-energy', 'educational', 'elegant']).optional(),
  attendees: z.coerce.number().int().min(1).max(100_000).optional(),
  sort: z.enum(['relevance', 'price-asc', 'price-desc', 'popularity', 'rating']).optional(),
});

export const availabilityQuery = z.object({ from: isoDate, to: isoDate, cityId: id.optional() });

export const createBooking = z
  .object({
    selection: z
      .object({
        serviceId: id,
        packageId: z.string().min(1).max(64),
        addOns: z
          .array(z.object({ addOnId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(100) }).strict())
          .max(20)
          .default([]),
      })
      .strict(),
    event: z
      .object({
        eventTypeId: id,
        date: isoDate,
        startTime: time,
        extraHours: z.number().int().min(0).max(12).default(0),
        cityId: id,
        venue: requiredText(200),
        attendees: z.number().int().min(1).max(100_000),
        notes: text(1000).optional(),
      })
      .strict(),
    customer: z
      .object({
        fullName: requiredText(120),
        phone: saudiMobile,
        email,
        contactMethod: z.enum(['phone', 'whatsapp', 'email']),
      })
      .strict(),
  })
  .strict();

export const modificationRequest = z.object({ modificationRequest: z.object({ message: requiredText(1000) }).strict() }).strict();
export const cancellationRequest = z.object({ reason: text(500).optional() }).strict();

export const contactMessage = z
  .object({
    name: requiredText(120),
    email,
    phone: z.string().max(32).optional(),
    subject: requiredText(60),
    message: requiredText(3000),
  })
  .strict();

export const otpRequest = z.object({ phone: saudiMobile }).strict();
export const otpVerify = z.object({ phone: saudiMobile, code: z.string().regex(/^\d{6}$/) }).strict();

// ---------- Staff ----------

export const login = z.object({ email, password: z.string().min(1).max(200) }).strict();
export const changePassword = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(1).max(200) }).strict();

export const bookingQuery = z.object({
  q: text(100).optional(),
  status: z
    .enum(['needs_action', 'draft', 'pending_request', 'pending_confirmation', 'confirmed', 'completed', 'cancellation_requested', 'cancelled'])
    .optional(),
  cityId: id.optional(),
  serviceId: id.optional(),
  categoryId: id.optional(),
  providerId: id.optional(),
  customerId: id.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sort: z.enum(['event-asc', 'event-desc', 'created-desc', 'total-desc']).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  // Exports ask for "everything"; capped so one request cannot pull an unbounded table.
  pageSize: z.coerce.number().int().min(1).transform((n) => Math.min(n, 5000)).default(20),
});

export const transition = z
  .object({
    action: z.enum(['start_review', 'confirm', 'reject', 'complete', 'approve_cancellation', 'decline_cancellation']),
    note: text(1000).optional(),
  })
  .strict();
export const optionalNote = z.object({ note: text(1000).optional() }).strict();
export const internalNote = z.object({ text: requiredText(2000) }).strict();

const servicePackage = z
  .object({
    id: id.or(z.string().regex(/^[a-z0-9-]{1,64}$/)),
    name: localizedRequired(120),
    description: localized(1000),
    price: money,
    durationMinutes: z.number().int().min(15).max(24 * 60),
    maxAttendees: z.number().int().min(1).max(100_000),
    includes: z.array(localized(200)).max(30),
    popular: z.boolean().optional(),
  })
  .strict();
const serviceAddOn = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,64}$/),
    name: localizedRequired(120),
    description: localized(1000),
    price: money,
    quantifiable: z.boolean(),
    maxQuantity: z.number().int().min(1).max(100),
  })
  .strict();

/**
 * Fields staff may change on a service. Ratings, reviews, booking counts and the
 * derived starting price/duration are owned by the server and ignored if sent.
 */
export const servicePatch = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
    categoryId: id,
    providerId: id,
    providerName: localized(120),
    name: localizedRequired(120),
    shortDescription: localized(300),
    description: localized(5000),
    media: z
      .array(z.object({ url: z.string().url().startsWith('https://').max(1000).optional(), motif, alt: localized(200) }).strict())
      .max(20),
    extraHourPrice: money.optional(),
    maxExtraHours: z.number().int().min(0).max(12),
    eventTypeIds: z.array(id).max(30),
    cityIds: z.array(id).max(50),
    audience: z.array(z.enum(['toddlers', 'kids', 'teens', 'adults', 'all'])).max(5),
    ageRange: z.object({ min: z.number().int().min(0).max(120), max: z.number().int().min(0).max(120).optional() }).strict(),
    styles: z.array(z.enum(['calm', 'interactive', 'high-energy', 'educational', 'elegant'])).max(5),
    packages: z.array(servicePackage).min(1).max(20),
    addOns: z.array(serviceAddOn).max(30),
    requirements: z.array(localized(300)).max(30),
    faqs: z.array(z.object({ question: localized(300), answer: localized(2000) }).strict()).max(30),
    featured: z.boolean().optional(),
    tags: z.array(z.string().max(40)).max(30),
    active: z.boolean(),
    // Server-owned, accepted and ignored so the dashboard can send the whole record back.
    id: z.unknown(),
    startingPrice: z.unknown(),
    durationMinutes: z.unknown(),
    rating: z.unknown(),
    reviewCount: z.unknown(),
    reviews: z.unknown(),
    bookingsCount: z.unknown(),
    updatedAt: z.unknown(),
  })
  .partial()
  .strict();

export const category = z
  .object({
    id,
    slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
    name: localizedRequired(120),
    description: localized(500),
    motif,
    sortOrder: z.number().int().min(0).max(10_000),
    active: z.boolean(),
  })
  .strict();

export const provider = z
  .object({
    id,
    name: localizedRequired(120),
    contactName: text(120),
    phone: anyPhone.or(z.literal('')),
    email: email.or(z.literal('')),
    cityIds: z.array(id).max(50),
    status: z.enum(['active', 'pending', 'suspended']),
    commissionRate: z.number().min(0).max(1),
    joinedAt: z.string().datetime({ offset: true }).or(isoDate),
    notes: text(2000).optional(),
    // Stats are computed by the server.
    serviceCount: z.unknown(),
    bookingCount: z.unknown(),
    revenue: z.unknown(),
    rating: z.unknown(),
  })
  .partial({ serviceCount: true, bookingCount: true, revenue: true, rating: true, notes: true })
  .strict();

export const customerQuery = z.object({
  q: text(100).optional(),
  tag: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).transform((n) => Math.min(n, 500)).default(20),
});

/** Staff can tag, annotate and block customers; contact details belong to the customer. */
export const customerPatch = z
  .object({
    tags: z.array(z.string().regex(/^[a-z0-9-]{1,30}$/)).max(10),
    notes: text(2000),
    blocked: z.boolean(),
  })
  .partial()
  .strict();

export const pricingSettings = z
  .object({
    vat: z.object({ enabled: z.boolean(), rate: z.number().min(0).max(1), pricesIncludeVat: z.boolean() }).strict(),
    applyTravelFee: z.boolean(),
    travelFees: z.record(id, money),
    minLeadDays: z.number().int().min(0).max(365),
    maxAdvanceDays: z.number().int().min(1).max(1000),
    cancellationCutoffHours: z.number().min(0).max(24 * 60),
    modificationCutoffHours: z.number().min(0).max(24 * 60),
    freeWithdrawalBeforeConfirmation: z.boolean(),
    defaultCommissionRate: z.number().min(0).max(1),
  })
  .strict()
  .refine((s) => s.maxAdvanceDays > s.minLeadDays, { message: 'maxAdvanceDays must be after minLeadDays', path: ['maxAdvanceDays'] });

export const promotion = z
  .object({
    id,
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'admin.promotions.codeInvalid'),
    name: localized(120),
    kind: z.enum(['percent', 'fixed']),
    value: z.number().positive().max(1_000_000),
    minSubtotal: money,
    startsOn: isoDate,
    endsOn: isoDate,
    maxUses: z.number().int().positive().optional(),
    uses: z.unknown().optional(), // counted by the server
    active: z.boolean(),
    categoryIds: z.array(id).max(50),
  })
  .strict()
  .refine((p) => p.kind !== 'percent' || p.value <= 100, { message: 'Percent above 100', path: ['value'] })
  .refine((p) => p.endsOn >= p.startsOn, { message: 'Ends before it starts', path: ['endsOn'] });

export const staffUser = z
  .object({
    id,
    name: requiredText(120),
    email,
    role: z.enum(['admin', 'operations', 'finance', 'viewer']),
    active: z.boolean(),
    lastActiveAt: z.unknown().optional(),
  })
  .strict();

export const reportQuery = z.object({ from: isoDate, to: isoDate }).refine((r) => r.to >= r.from, 'Invalid range');
export const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(500).default(50) });
