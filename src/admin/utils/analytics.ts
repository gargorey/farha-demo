import { BOOKING_STATUSES, type BookingStatus } from '@/models';
import { addDays } from '@/utils/dates';
import type { AdminBooking, BookingChannel, DashboardSummary, ReportData } from '../models';
import { isRevenueStatus, needsAction } from './booking-actions';

/**
 * Dashboard and report calculations, shared by the in-browser demo
 * (mock-admin-client) and the backend (server/), so both give the same numbers.
 */

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const monthOf = (iso: string) => iso.slice(0, 7);

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number);
  const [ty, tm] = to.slice(0, 7).split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function groupRevenue<K extends string>(bookings: AdminBooking[], key: (b: AdminBooking) => K) {
  const map = new Map<K, { id: K; revenue: number; bookings: number }>();
  for (const b of bookings) {
    const k = key(b);
    const row = map.get(k) ?? { id: k, revenue: 0, bookings: 0 };
    row.bookings++;
    if (isRevenueStatus(b.status)) row.revenue = round2(row.revenue + b.pricing.total);
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings);
}

/** First day of the month-by-month revenue chart on the overview (about 5 months back). */
export const dashboardWindowStart = (today: string) => addDays(`${monthOf(today)}-01`, -150);

/**
 * Overview numbers. `all` must contain every booking that can affect them: events since
 * dashboardWindowStart(today), bookings created since last month, and every open booking.
 */
export function buildDashboard(all: AdminBooking[], today: string): DashboardSummary {
  const thisMonth = monthOf(today);
  const lastMonth = monthOf(addDays(`${thisMonth}-01`, -1));
  const created = (m: string) => all.filter((b) => monthOf(b.createdAt) === m && b.status !== 'draft').length;
  const revenue = (m: string) => round2(all.filter((b) => monthOf(b.event.date) === m && isRevenueStatus(b.status)).reduce((s, b) => s + b.pricing.total, 0));
  const months = monthsBetween(dashboardWindowStart(today), today);
  const upcoming = all
    .filter((b) => b.event.date >= today && b.event.date <= addDays(today, 7) && (b.status === 'confirmed' || b.status === 'cancellation_requested'))
    .sort((a, b) => (a.event.date + a.event.startTime).localeCompare(b.event.date + b.event.startTime));
  const queue = all.filter(needsAction).sort((a, b) => a.event.date.localeCompare(b.event.date));
  const statusCounts = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
  all.forEach((b) => statusCounts[b.status]++);
  return {
    bookingsThisMonth: created(thisMonth),
    bookingsLastMonth: created(lastMonth),
    revenueThisMonth: revenue(thisMonth),
    revenueLastMonth: revenue(lastMonth),
    needsAction: queue.length,
    upcoming7Days: upcoming.length,
    actionQueue: queue.slice(0, 8),
    upcoming: upcoming.slice(0, 8),
    revenueByMonth: months.map((m) => ({
      month: m,
      revenue: revenue(m),
      bookings: all.filter((b) => monthOf(b.event.date) === m && isRevenueStatus(b.status)).length,
    })),
    statusCounts,
  };
}

export interface ReportContext {
  /** serviceId → its category and provider */
  services: Map<string, { categoryId: string; providerId: string }>;
  /** providerId → commission rate */
  commissionRates: Map<string, number>;
  defaultCommissionRate: number;
}

/** Report for bookings whose event date is within [from, to]. `bookings` may contain others; they are filtered here. */
export function buildReport(bookings: AdminBooking[], ctx: ReportContext, from: string, to: string): ReportData {
  const inRange = bookings.filter((b) => b.event.date >= from && b.event.date <= to && b.status !== 'draft');
  const paid = inRange.filter((b) => isRevenueStatus(b.status));
  const gross = round2(paid.reduce((s, b) => s + b.pricing.total, 0));
  const vat = round2(paid.reduce((s, b) => s + b.pricing.vat, 0));
  const commission = round2(
    paid.reduce((s, b) => {
      const rate = ctx.commissionRates.get(ctx.services.get(b.selection.serviceId)?.providerId ?? '') ?? ctx.defaultCommissionRate;
      return s + (b.pricing.subtotal - b.pricing.discountTotal) * rate;
    }, 0),
  );
  const channelCounts = new Map<BookingChannel, number>();
  inRange.forEach((b) => channelCounts.set(b.channel ?? 'website', (channelCounts.get(b.channel ?? 'website') ?? 0) + 1));
  return {
    range: { from, to },
    bookings: inRange.length,
    confirmedBookings: paid.length,
    grossRevenue: gross,
    netRevenue: round2(gross - vat),
    vatCollected: vat,
    commission,
    averageBookingValue: paid.length ? round2(gross / paid.length) : 0,
    cancellationRate: inRange.length ? inRange.filter((b) => b.status === 'cancelled').length / inRange.length : 0,
    byMonth: monthsBetween(from, to).map((m) => {
      const rows = paid.filter((b) => monthOf(b.event.date) === m);
      return { month: m, revenue: round2(rows.reduce((s, b) => s + b.pricing.total, 0)), bookings: rows.length };
    }),
    byCategory: groupRevenue(inRange, (b) => ctx.services.get(b.selection.serviceId)?.categoryId ?? 'unknown'),
    byCity: groupRevenue(inRange, (b) => b.event.cityId),
    byEventType: groupRevenue(inRange, (b) => b.event.eventTypeId),
    topServices: groupRevenue(inRange, (b) => b.selection.serviceId).slice(0, 8),
    byChannel: [...channelCounts.entries()].map(([id, count]) => ({ id, bookings: count })).sort((a, b) => b.bookings - a.bookings),
  };
}
