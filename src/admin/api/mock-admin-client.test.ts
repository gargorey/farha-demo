import { beforeEach, describe, expect, it } from 'vitest';
import { bookingStore } from '@/services/mock/booking-store';
import { createMockClient } from '@/services/mock/mock-client';
import { mockDayAvailability } from '@/utils/availability';
import { addDays, todayISO } from '@/utils/dates';
import { can } from '../auth/roles';
import { adminStore } from '../data/admin-store';
import { generateDataset } from '../data/seed';
import { availableActions } from '../utils/booking-actions';
import { createMockAdminClient } from './mock-admin-client';

const admin = createMockAdminClient(() => 'Tester', 0);
const site = createMockClient(0);

beforeEach(() => {
  localStorage.clear();
  adminStore.reset();
});

describe('sample data', () => {
  it('is deterministic and internally consistent', () => {
    const now = new Date('2026-10-18T09:00:00Z');
    const a = generateDataset(now);
    const b = generateDataset(now);
    expect(a.bookings.map((x) => x.reference)).toEqual(b.bookings.map((x) => x.reference));
    expect(new Set(a.bookings.map((x) => x.reference)).size).toBe(a.bookings.length);
    const serviceIds = new Set(a.services.map((s) => s.id));
    for (const bk of a.bookings) {
      expect(serviceIds.has(bk.selection.serviceId)).toBe(true);
      expect(new Date(bk.createdAt).getTime()).toBeLessThanOrEqual(now.getTime());
      if (bk.event.date < todayISO(now)) expect(['completed', 'cancelled']).toContain(bk.status);
      expect(bk.history[bk.history.length - 1].status).toBe(bk.status);
    }
    expect(a.providers.every((p) => a.services.some((s) => s.providerId === p.id))).toBe(true);
  });
});

describe('booking operations', () => {
  it('confirms a new request and records both steps in the history', async () => {
    const { items } = await admin.listBookings({ status: 'pending_request', pageSize: 1 });
    const updated = await admin.transitionBooking(items[0].id, 'confirm', 'Provider accepted');
    expect(updated.status).toBe('confirmed');
    expect(updated.history.slice(-2).map((h) => h.noteKey)).toEqual(['history.staffReviewing', 'history.staffConfirmed']);
    expect((await admin.getBooking(items[0].id)).status).toBe('confirmed');
    expect((await admin.listAudit(1))[0]).toMatchObject({ by: 'Tester', action: 'booking.confirm' });
  });

  it('refuses actions that the lifecycle does not allow', async () => {
    const { items } = await admin.listBookings({ status: 'completed', pageSize: 1 });
    await expect(admin.transitionBooking(items[0].id, 'confirm')).rejects.toMatchObject({ code: 'TRANSITION_NOT_ALLOWED' });
    expect(availableActions(items[0])).toEqual([]);
  });

  it('only allows completing an event once its date has arrived', async () => {
    const { items } = await admin.listBookings({ status: 'confirmed', from: addDays(todayISO(), 5), pageSize: 1 });
    expect(availableActions(items[0])).not.toContain('complete');
    await expect(admin.transitionBooking(items[0].id, 'complete')).rejects.toMatchObject({ code: 'TRANSITION_NOT_ALLOWED' });
  });

  it('shows website bookings and writes decisions back to the website store', async () => {
    let date = addDays(todayISO(), 5);
    while (mockDayAvailability('svc-clown-bobo', date).state === 'unavailable') date = addDays(date, 1);
    const created = await site.createBooking({
      idempotencyKey: 'k',
      selection: { serviceId: 'svc-clown-bobo', packageId: 'party', addOns: [] },
      event: { eventTypeId: 'birthday', date, startTime: '17:00', extraHours: 0, cityId: 'riyadh', venue: 'Home', attendees: 10 },
      customer: { fullName: 'Web Customer', phone: '+966551112222', email: 'web@example.com', contactMethod: 'whatsapp' },
    });
    const found = await admin.getBooking(created.id);
    expect(found.origin).toBe('website');
    expect((await admin.listBookings({ status: 'needs_action', q: 'Web Customer' })).total).toBe(1);

    await admin.transitionBooking(created.id, 'confirm');
    const onSite = await site.getBooking(created.id);
    expect(onSite.status).toBe('confirmed');
    expect('origin' in onSite).toBe(false);

    const customers = await admin.listCustomers({ tag: 'website' });
    expect(customers.items.some((c) => c.fullName === 'Web Customer')).toBe(true);
    bookingStore.clear();
  });
});

describe('reports and settings', () => {
  it('reports revenue consistent with VAT and bookings', async () => {
    const r = await admin.getReport({ from: addDays(todayISO(), -180), to: todayISO() });
    expect(r.grossRevenue).toBeGreaterThan(0);
    expect(r.netRevenue + r.vatCollected).toBeCloseTo(r.grossRevenue, 1);
    expect(r.byMonth.reduce((s, m) => s + m.bookings, 0)).toBe(r.confirmedBookings);
  });

  it('rejects duplicate promotion codes', async () => {
    const [p] = await admin.listPromotions();
    await expect(admin.savePromotion({ ...p, id: 'other', code: p.code.toLowerCase() })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('permissions', () => {
  it('gives each role only its own powers', () => {
    expect(can('admin', 'staff.manage')).toBe(true);
    expect(can('operations', 'bookings.manage')).toBe(true);
    expect(can('operations', 'pricing.manage')).toBe(false);
    expect(can('finance', 'bookings.manage')).toBe(false);
    expect(can('viewer', 'reports.view')).toBe(false);
    expect(can(undefined, 'bookings.manage')).toBe(false);
  });
});
