import { businessConfig } from '@/config/business';
import type { AdminService, PricingSettings } from '@/admin/models';
import type { DayAvailability } from '@/models';
import { addDays, daysBetween, todayISO } from '@/utils/dates';
import type { Queryable } from '../db/pool';

/**
 * Availability from real bookings. Until providers manage their own calendars,
 * a service is free at a start time unless another open booking for the same
 * service overlaps it (plus a travel/setup buffer). Days far ahead are shown as
 * "not verified" because providers have not confirmed them yet.
 */

/** Bookings that hold the provider's time. */
export const BLOCKING_STATUSES = ['pending_request', 'pending_confirmation', 'confirmed', 'cancellation_requested'] as const;
/** Gap kept between two bookings of the same service (travel, setup). */
export const BUFFER_MINUTES = 60;

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export interface BusySlot {
  date: string;
  start: number;
  end: number;
}

export function overlaps(start: number, duration: number, busy: BusySlot[], date: string): boolean {
  const end = start + duration;
  return busy.some((b) => b.date === date && start < b.end + BUFFER_MINUTES && b.start < end + BUFFER_MINUTES);
}

export async function busySlots(db: Queryable, serviceId: string, from: string, to: string, excludeBookingId?: string): Promise<BusySlot[]> {
  const { rows } = await db.query<{ event_date: string; start_time: string; duration_minutes: number }>(
    `SELECT event_date, start_time, duration_minutes FROM bookings
      WHERE service_id = $1 AND event_date BETWEEN $2 AND $3 AND status = ANY($4) AND id <> COALESCE($5, '')`,
    [serviceId, from, to, BLOCKING_STATUSES, excludeBookingId ?? null],
  );
  return rows.map((r) => ({ date: r.event_date, start: toMinutes(r.start_time), end: toMinutes(r.start_time) + r.duration_minutes }));
}

/** Is the date inside the bookable window (lead time … max advance)? */
export function inBookingWindow(date: string, settings: PricingSettings, today = todayISO()): boolean {
  const offset = daysBetween(today, date);
  return offset >= settings.minLeadDays && offset <= settings.maxAdvanceDays;
}

export function dayAvailability(date: string, service: AdminService, settings: PricingSettings, busy: BusySlot[], today = todayISO()): DayAvailability {
  const { verifiedAvailabilityDays, defaultStartTimes } = businessConfig.booking;
  if (!inBookingWindow(date, settings, today)) return { date, state: 'unavailable', slots: [] };
  const free = defaultStartTimes.filter((t) => !overlaps(toMinutes(t), service.durationMinutes, busy, date));
  if (daysBetween(today, date) > verifiedAvailabilityDays) return { date, state: free.length ? 'unverified' : 'unavailable', slots: free };
  if (!free.length) return { date, state: 'unavailable', slots: [] };
  return { date, state: free.length <= defaultStartTimes.length / 3 ? 'limited' : 'available', slots: free };
}

export async function availabilityRange(db: Queryable, service: AdminService, settings: PricingSettings, from: string, to: string): Promise<DayAvailability[]> {
  const total = Math.max(0, Math.min(daysBetween(from, to), 366));
  const end = addDays(from, total);
  const busy = await busySlots(db, service.id, from, end);
  return Array.from({ length: total + 1 }, (_, i) => dayAvailability(addDays(from, i), service, settings, busy));
}

export const startMinutes = toMinutes;
