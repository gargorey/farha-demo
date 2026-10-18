import { businessConfig } from '@/config/business';
import type { Booking, BookingStatus } from '@/models';
import { hoursUntil } from './dates';

/**
 * Allowed status transitions. "actor" says who is expected to trigger them;
 * provider/system transitions need the backend (Project 2) and are only
 * simulated in the demo.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, { to: BookingStatus; actor: 'customer' | 'provider' | 'system' }[]> = {
  draft: [{ to: 'pending_request', actor: 'customer' }],
  pending_request: [
    { to: 'pending_confirmation', actor: 'system' },
    { to: 'cancelled', actor: 'customer' },
  ],
  pending_confirmation: [
    { to: 'confirmed', actor: 'provider' },
    { to: 'cancelled', actor: 'customer' },
    { to: 'cancelled', actor: 'provider' },
  ],
  confirmed: [
    { to: 'cancellation_requested', actor: 'customer' },
    { to: 'completed', actor: 'system' },
  ],
  cancellation_requested: [
    { to: 'cancelled', actor: 'provider' },
    { to: 'confirmed', actor: 'provider' },
  ],
  completed: [],
  cancelled: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].some((t) => t.to === to);
}

export const isActiveStatus = (s: BookingStatus) =>
  s === 'pending_request' || s === 'pending_confirmation' || s === 'confirmed' || s === 'cancellation_requested';

export type CancellationAction =
  | { kind: 'withdraw' } // before provider confirmation: cancel straight away
  | { kind: 'request' } // confirmed: ask for cancellation, provider decides
  | { kind: 'blocked'; reason: 'status' | 'window' };

/** Policy values the lifecycle rules depend on. The backend passes its own (admin-editable) settings. */
export interface LifecyclePolicy {
  freeWithdrawalBeforeConfirmation: boolean;
  cancellationCutoffHours: number;
  modificationCutoffHours: number;
}

export function cancellationActionFor(
  booking: Pick<Booking, 'status' | 'event'>,
  now: Date = new Date(),
  policy: LifecyclePolicy = businessConfig.policy,
): CancellationAction {
  const { status } = booking;
  if (status === 'pending_request' || status === 'pending_confirmation') {
    return policy.freeWithdrawalBeforeConfirmation ? { kind: 'withdraw' } : { kind: 'request' };
  }
  if (status !== 'confirmed') return { kind: 'blocked', reason: 'status' };
  const hours = hoursUntil(booking.event.date, booking.event.startTime, now);
  if (hours < policy.cancellationCutoffHours) return { kind: 'blocked', reason: 'window' };
  return { kind: 'request' };
}

export type ModificationAvailability = { allowed: true } | { allowed: false; reason: 'status' | 'window' | 'pending' };

export function modificationAvailability(
  booking: Pick<Booking, 'status' | 'event' | 'modificationRequest'>,
  now: Date = new Date(),
  policy: LifecyclePolicy = businessConfig.policy,
): ModificationAvailability {
  if (!['pending_request', 'pending_confirmation', 'confirmed'].includes(booking.status)) {
    return { allowed: false, reason: 'status' };
  }
  if (booking.modificationRequest) return { allowed: false, reason: 'pending' };
  const hours = hoursUntil(booking.event.date, booking.event.startTime, now);
  if (hours < policy.modificationCutoffHours) return { allowed: false, reason: 'window' };
  return { allowed: true };
}
