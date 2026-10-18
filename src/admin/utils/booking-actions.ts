import type { BookingStatus } from '@/models';
import { todayISO } from '@/utils/dates';
import type { AdminBooking, BookingAction } from '../models';

/** What each staff action does to a booking. Mirrors BOOKING_TRANSITIONS in src/utils/booking-lifecycle.ts. */
export const ACTIONS: Record<BookingAction, { from: BookingStatus[]; to: BookingStatus; noteKey: string; tone: 'primary' | 'danger' | 'outline' }> = {
  start_review: { from: ['pending_request'], to: 'pending_confirmation', noteKey: 'history.staffReviewing', tone: 'outline' },
  confirm: { from: ['pending_request', 'pending_confirmation'], to: 'confirmed', noteKey: 'history.staffConfirmed', tone: 'primary' },
  reject: { from: ['pending_request', 'pending_confirmation'], to: 'cancelled', noteKey: 'history.staffRejected', tone: 'danger' },
  complete: { from: ['confirmed'], to: 'completed', noteKey: 'history.staffCompleted', tone: 'primary' },
  approve_cancellation: { from: ['cancellation_requested'], to: 'cancelled', noteKey: 'history.staffCancellationApproved', tone: 'danger' },
  decline_cancellation: { from: ['cancellation_requested'], to: 'confirmed', noteKey: 'history.staffCancellationDeclined', tone: 'outline' },
};

/** Actions a staff member can take on a booking right now, in display order. */
export function availableActions(b: AdminBooking, today = todayISO()): BookingAction[] {
  return (Object.keys(ACTIONS) as BookingAction[]).filter((a) => {
    if (!ACTIONS[a].from.includes(b.status)) return false;
    // An event can only be marked completed once its date has arrived.
    if (a === 'complete') return b.event.date <= today;
    return true;
  });
}

export const isOpenStatus = (s: BookingStatus) =>
  s === 'pending_request' || s === 'pending_confirmation' || s === 'confirmed' || s === 'cancellation_requested';

/** Bookings waiting on the team: new requests, reviews, cancellation and change requests. */
export const needsAction = (b: AdminBooking) =>
  b.status === 'pending_request' ||
  b.status === 'pending_confirmation' ||
  b.status === 'cancellation_requested' ||
  (!!b.modificationRequest && isOpenStatus(b.status));

/** Bookings that count towards revenue. */
export const isRevenueStatus = (s: BookingStatus) => s === 'confirmed' || s === 'completed' || s === 'cancellation_requested';
