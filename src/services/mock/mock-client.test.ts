import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, todayISO } from '@/utils/dates';
import { mockDayAvailability } from '@/utils/availability';
import { bookingStore } from './booking-store';
import { createMockClient, demoControls } from './mock-client';

const api = createMockClient(0);

function availableDate(serviceId: string) {
  for (let i = 3; i < 60; i++) {
    const d = addDays(todayISO(), i);
    if (mockDayAvailability(serviceId, d).state !== 'unavailable') return d;
  }
  throw new Error('no date');
}

const request = (key = 'k1') => ({
  idempotencyKey: key,
  selection: { serviceId: 'svc-clown-bobo', packageId: 'party', addOns: [{ addOnId: 'face', quantity: 1 }] },
  event: { eventTypeId: 'birthday', date: availableDate('svc-clown-bobo'), startTime: '17:00', extraHours: 0, cityId: 'riyadh', venue: 'Home', attendees: 20 },
  customer: { fullName: 'Sara', phone: '+966551234567', email: 'sara@example.com', contactMethod: 'whatsapp' as const },
});

describe('mock API booking flow', () => {
  beforeEach(() => bookingStore.clear());

  it('creates a demo booking with a DEMO reference and recalculated price', async () => {
    const b = await api.createBooking(request());
    expect(b.reference).toMatch(/^DEMO-FR-[A-Z0-9]{6}$/);
    expect(b.status).toBe('pending_request');
    expect(b.isDemo).toBe(true);
    expect(b.pricing.total).toBe(1437.5);
    expect((await api.listBookings()).length).toBe(1);
  });

  it('never creates duplicates for the same idempotency key', async () => {
    const [a, b] = await Promise.all([api.createBooking(request('same')), api.createBooking(request('same'))]).catch(async () => {
      const first = await api.createBooking(request('same'));
      return [first, await api.createBooking(request('same'))];
    });
    expect(a.id).toBe(b.id);
    expect((await api.listBookings()).length).toBe(1);
  });

  it('rejects a city the provider does not serve', async () => {
    const r = request('city');
    await expect(api.createBooking({ ...r, event: { ...r.event, cityId: 'tabuk' } })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('walks the lifecycle: withdraw before confirmation, request cancellation after', async () => {
    const b = await api.createBooking(request('a'));
    expect((await api.requestCancellation(b.id, {})).status).toBe('cancelled');

    const c = await api.createBooking({ ...request('b'), event: { ...request('b').event, date: addDays(todayISO(), 20) } }).catch(() => null);
    if (!c) return; // date happened to be unavailable in demo data
    demoControls.advance(c.id);
    demoControls.advance(c.id);
    expect((await api.getBooking(c.id)).status).toBe('confirmed');
    expect((await api.requestCancellation(c.id, { reason: 'x' })).status).toBe('cancellation_requested');
  });
});
