import { appEnv } from '@/config/env';
import { ApiError, type Booking, type BookingStatus, type City, type CreateBookingRequest } from '@/models';
import { cancellationActionFor, canTransition, modificationAvailability } from '@/utils/booking-lifecycle';
import { filterAndSortServices } from '@/utils/catalog-search';
import { mockAvailabilityRange, mockDayAvailability } from '@/utils/availability';
import { addDays, isValidISODate, todayISO } from '@/utils/dates';
import { calculatePricing } from '@/utils/pricing';
import { readJSON } from '@/utils/storage';
import type { ApiClient } from '../api/client';
import { bookingStore } from './booking-store';
import { categories, cities, eventTypes } from './reference-data';
import { services } from './services-data';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);

/** Demo switch to show the booking-submission error state: add ?simulate=booking-error to any URL. */
export const SIMULATE_KEY = 'farha.demo.simulate';
const shouldFail = (what: string) => readJSON<string | null>(SIMULATE_KEY, null, 'session') === what;

const categoryNames = Object.fromEntries(categories.map((c) => [c.id, [c.name.ar, c.name.en]]));

function randomRef(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `DEMO-FR-${out}`;
}

function findService(idOrSlug: string) {
  const s = services.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
  if (!s) throw new ApiError('NOT_FOUND', 404, `Service ${idOrSlug} not found`);
  return s;
}

function mustGetBooking(id: string): Booking {
  const b = bookingStore.get(id);
  if (!b) throw new ApiError('NOT_FOUND', 404, `Booking ${id} not found`);
  return b;
}

function transition(b: Booking, to: BookingStatus, noteKey: string, note?: string): Booking {
  if (!canTransition(b.status, to)) throw new ApiError('TRANSITION_NOT_ALLOWED', 409);
  const at = new Date().toISOString();
  return { ...b, status: to, updatedAt: at, history: [...b.history, { at, status: to, noteKey, note }] };
}

/** Server-side style checks, mirrored from what Project 2 must enforce. */
function validateCreate(req: CreateBookingRequest): { city: City } {
  const service = findService(req.selection.serviceId);
  const fieldErrors = [];
  if (!service.packages.some((p) => p.id === req.selection.packageId)) fieldErrors.push({ field: 'packageId', messageKey: 'validation.required' });
  const city = cities.find((c) => c.id === req.event.cityId);
  if (!city || !service.cityIds.includes(city.id)) fieldErrors.push({ field: 'cityId', messageKey: 'validation.cityNotServed' });
  if (!service.eventTypeIds.includes(req.event.eventTypeId)) fieldErrors.push({ field: 'eventTypeId', messageKey: 'validation.eventTypeNotSupported' });
  if (!isValidISODate(req.event.date)) fieldErrors.push({ field: 'date', messageKey: 'validation.date' });
  if (!req.customer.fullName || !req.customer.phone || !req.customer.email) fieldErrors.push({ field: 'customer', messageKey: 'validation.required' });
  if (fieldErrors.length || !city) throw new ApiError('VALIDATION_ERROR', 422, 'Invalid booking', fieldErrors);
  if (mockDayAvailability(service.id, req.event.date).state === 'unavailable') throw new ApiError('DATE_UNAVAILABLE', 409);
  return { city };
}

export function createMockClient(latencyMs = appEnv.mockLatencyMs): ApiClient {
  const delay = () => sleep(latencyMs);
  const idempotency = new Map<string, string>();

  return {
    isDemo: true,

    async listServices(query = {}) {
      await delay();
      const items = filterAndSortServices(services, query, categoryNames);
      return { items: clone(items), total: items.length };
    },
    async getService(idOrSlug) {
      await delay();
      return clone(findService(idOrSlug));
    },
    async listCategories() {
      await delay();
      return clone([...categories].sort((a, b) => a.sortOrder - b.sortOrder));
    },
    async listEventTypes() {
      return clone(eventTypes);
    },
    async listCities() {
      return clone(cities);
    },
    async getAvailability({ serviceId, from, to }) {
      await sleep(latencyMs / 2);
      findService(serviceId);
      return mockAvailabilityRange(serviceId, from, to);
    },

    async createBooking(req) {
      await sleep(latencyMs * 2);
      const existing = idempotency.get(req.idempotencyKey);
      const previous = existing ? bookingStore.get(existing) : undefined;
      if (previous) return clone(previous);
      if (shouldFail('booking-error')) throw new ApiError('NETWORK_ERROR', 503, 'Simulated failure');

      const { city } = validateCreate(req);
      const service = findService(req.selection.serviceId);
      const pricing = calculatePricing({
        service,
        packageId: req.selection.packageId,
        addOns: req.selection.addOns,
        extraHours: req.event.extraHours,
        city,
      });
      const now = new Date().toISOString();
      const booking: Booking = {
        id: crypto.randomUUID(),
        reference: randomRef(),
        isDemo: true,
        status: 'pending_request',
        selection: clone(req.selection),
        event: clone(req.event),
        customer: clone(req.customer),
        pricing,
        createdAt: now,
        updatedAt: now,
        history: [{ at: now, status: 'pending_request', noteKey: 'history.submitted' }],
      };
      bookingStore.save(booking);
      idempotency.set(req.idempotencyKey, booking.id);
      return clone(booking);
    },

    async getBooking(id) {
      await delay();
      return clone(mustGetBooking(id));
    },
    async listBookings() {
      await delay();
      return clone(bookingStore.all());
    },

    async requestModification(id, { message }) {
      await delay();
      const b = mustGetBooking(id);
      const availability = modificationAvailability(b);
      if (!availability.allowed) throw new ApiError('POLICY_WINDOW_CLOSED', 409, availability.reason);
      const at = new Date().toISOString();
      const updated: Booking = {
        ...b,
        updatedAt: at,
        modificationRequest: { message, requestedAt: at },
        history: [...b.history, { at, status: b.status, noteKey: 'history.modificationRequested', note: message }],
      };
      bookingStore.save(updated);
      return clone(updated);
    },

    async requestCancellation(id, { reason }) {
      await delay();
      const b = mustGetBooking(id);
      const action = cancellationActionFor(b);
      if (action.kind === 'blocked') throw new ApiError('POLICY_WINDOW_CLOSED', 409, action.reason);
      const updated =
        action.kind === 'withdraw'
          ? transition(b, 'cancelled', 'history.withdrawn', reason)
          : transition(b, 'cancellation_requested', 'history.cancellationRequested', reason);
      bookingStore.save(updated);
      return clone(updated);
    },

    async sendContactMessage() {
      await delay();
      return { id: `DEMO-MSG-${Date.now().toString(36).toUpperCase()}` };
    },

    // The browser demo has no accounts: every booking made in this browser is shown.
    async getPublicSettings() {
      return null;
    },
    async getCustomerSession() {
      return { verified: false };
    },
    async requestSignInCode() {
      return { sent: false };
    },
    async verifySignInCode() {
      return { verified: false };
    },
    async signOut() {},
  };
}

/**
 * DEMO-ONLY controls that stand in for provider/admin actions (Project 3)
 * so the full lifecycle can be shown to a client. Never part of the real API.
 */
export const demoControls = {
  advance(id: string): Booking {
    const b = mustGetBooking(id);
    const next: Partial<Record<BookingStatus, [BookingStatus, string]>> = {
      pending_request: ['pending_confirmation', 'history.providerReviewing'],
      pending_confirmation: ['confirmed', 'history.providerConfirmed'],
      cancellation_requested: ['cancelled', 'history.cancellationApproved'],
      confirmed: ['completed', 'history.completed'],
    };
    const step = next[b.status];
    if (!step) throw new ApiError('TRANSITION_NOT_ALLOWED', 409);
    const updated = transition(b, step[0], step[1]);
    bookingStore.save(updated);
    return updated;
  },
  seedSampleBookings(): void {
    const today = new Date();
    const iso = (offset: number) => addDays(todayISO(today), offset);
    const make = (
      serviceId: string,
      packageId: string,
      status: BookingStatus,
      dateOffset: number,
      cityId: string,
      eventTypeId: string,
      attendees: number,
      venue: string,
    ): Booking => {
      const service = findService(serviceId);
      const city = cities.find((c) => c.id === cityId)!;
      const created = new Date(today.getTime() - 5 * 86_400_000).toISOString();
      const statuses: BookingStatus[] = ['pending_request', 'pending_confirmation', 'confirmed', 'completed'];
      const reached = statuses.slice(0, statuses.indexOf(status) + 1);
      const keys: Record<string, string> = {
        pending_request: 'history.submitted',
        pending_confirmation: 'history.providerReviewing',
        confirmed: 'history.providerConfirmed',
        completed: 'history.completed',
      };
      return {
        id: crypto.randomUUID(),
        reference: randomRef(),
        isDemo: true,
        status,
        selection: { serviceId, packageId, addOns: [] },
        event: { eventTypeId, date: iso(dateOffset), startTime: '17:00', extraHours: 0, cityId, venue, attendees },
        customer: { fullName: 'Demo Customer', phone: '+966500000000', email: 'demo@example.com', contactMethod: 'whatsapp' },
        pricing: calculatePricing({ service, packageId, addOns: [], city }),
        createdAt: created,
        updatedAt: created,
        history: (reached.length ? reached : ['pending_request' as BookingStatus]).map((s) => ({ at: created, status: s, noteKey: keys[s] })),
      };
    };
    [
      make('svc-clown-bobo', 'party', 'confirmed', 12, 'riyadh', 'birthday', 20, 'Home – Al Malqa'),
      make('svc-bubble-wonderland', 'show', 'pending_confirmation', 25, 'jeddah', 'family', 30, 'Family rest house'),
      make('svc-magician-sultan', 'plus', 'completed', -20, 'riyadh', 'birthday', 25, 'Home – Al Nakheel'),
    ].forEach((b) => bookingStore.save(b));
  },
};
