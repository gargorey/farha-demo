import { describe, expect, it } from 'vitest';
import type { Booking, BookingStatus } from '@/models';
import { cancellationActionFor, canTransition, modificationAvailability } from './booking-lifecycle';

const now = new Date(2026, 9, 14, 10, 0);
const booking = (status: BookingStatus, date: string, startTime = '18:00'): Booking =>
  ({ status, event: { date, startTime }, history: [] }) as unknown as Booking;

describe('booking lifecycle', () => {
  it('allows only sensible transitions', () => {
    expect(canTransition('pending_request', 'pending_confirmation')).toBe(true);
    expect(canTransition('pending_confirmation', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'cancellation_requested')).toBe(true);
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
    expect(canTransition('completed', 'cancelled')).toBe(false);
    expect(canTransition('pending_request', 'completed')).toBe(false);
  });

  it('lets the customer withdraw before confirmation', () => {
    expect(cancellationActionFor(booking('pending_request', '2026-10-15'), now)).toEqual({ kind: 'withdraw' });
  });

  it('turns cancellation of a confirmed booking into a request, within the window', () => {
    expect(cancellationActionFor(booking('confirmed', '2026-10-20'), now)).toEqual({ kind: 'request' });
    expect(cancellationActionFor(booking('confirmed', '2026-10-15'), now)).toEqual({ kind: 'blocked', reason: 'window' });
    expect(cancellationActionFor(booking('cancelled', '2026-10-20'), now)).toEqual({ kind: 'blocked', reason: 'status' });
  });

  it('applies the modification window', () => {
    expect(modificationAvailability(booking('confirmed', '2026-10-20'), now)).toEqual({ allowed: true });
    expect(modificationAvailability(booking('confirmed', '2026-10-16'), now)).toEqual({ allowed: false, reason: 'window' });
    expect(modificationAvailability(booking('completed', '2026-10-20'), now)).toEqual({ allowed: false, reason: 'status' });
  });
});
