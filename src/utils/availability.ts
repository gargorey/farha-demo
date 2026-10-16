import { businessConfig } from '@/config/business';
import type { DayAvailability } from '@/models';
import { addDays, daysBetween, parseISODate, todayISO } from './dates';

/** Small deterministic hash so the same service/date always gets the same demo availability. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * DEMO availability generator. In production, availability is owned by the
 * provider and verified by the backend; nothing here is a real calendar.
 */
export function mockDayAvailability(serviceId: string, dateIso: string, today: string = todayISO()): DayAvailability {
  const { minLeadDays, maxAdvanceDays, verifiedAvailabilityDays, defaultStartTimes } = businessConfig.booking;
  const offset = daysBetween(today, dateIso);
  if (offset < minLeadDays || offset > maxAdvanceDays) {
    return { date: dateIso, state: 'unavailable', slots: [] };
  }
  if (offset > verifiedAvailabilityDays) {
    return { date: dateIso, state: 'unverified', slots: [...defaultStartTimes] };
  }
  const h = hash(`${serviceId}:${dateIso}`);
  const weekday = parseISODate(dateIso).getDay();
  const weekend = weekday === 4 || weekday === 5; // Thu/Fri are the busiest days in KSA
  const roll = h % 100;
  if (roll < (weekend ? 22 : 12)) return { date: dateIso, state: 'unavailable', slots: [] };
  const slots = defaultStartTimes.filter((_, i) => ((h >> i) & 1) === 1 || i % 3 === 0);
  if (roll < (weekend ? 50 : 30)) return { date: dateIso, state: 'limited', slots: slots.slice(0, 2) };
  return { date: dateIso, state: 'available', slots };
}

export function mockAvailabilityRange(serviceId: string, from: string, to: string): DayAvailability[] {
  const days: DayAvailability[] = [];
  const total = Math.min(daysBetween(from, to), 366);
  for (let i = 0; i <= total; i++) days.push(mockDayAvailability(serviceId, addDays(from, i)));
  return days;
}
