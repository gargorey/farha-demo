import { bookingStore } from '@/services/mock/booking-store';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import type { AdminBooking } from '../models';
import { DATASET_VERSION, generateDataset, type AdminDataset } from './seed';

/**
 * DEMO persistence for the admin dashboard: everything lives in this browser's
 * localStorage. Bookings made on the customer website (same browser, same site)
 * are read from the website's own store, so they appear here and status changes
 * made here show up on the website's "My bookings" page.
 */
const KEY = 'farha.demo.admin.v1';
/** Fired after any change so the layout can refresh counters (e.g. the "needs action" badge). */
export const ADMIN_CHANGE_EVENT = 'farha-admin-change';
const notify = () => typeof window !== 'undefined' && window.dispatchEvent(new Event(ADMIN_CHANGE_EVENT));

let cache: AdminDataset | null = null;

export const adminStore = {
  load(): AdminDataset {
    if (cache) return cache;
    const saved = readJSON<AdminDataset | null>(KEY, null);
    cache = saved && saved.version === DATASET_VERSION ? saved : generateDataset();
    if (!saved) writeJSON(KEY, cache);
    return cache;
  },
  update(mutate: (data: AdminDataset) => void): AdminDataset {
    const data = structuredClone(this.load());
    mutate(data);
    cache = data;
    writeJSON(KEY, data);
    notify();
    return data;
  },
  reset(): void {
    cache = null;
    removeKey(KEY);
  },

  /** Sample bookings plus bookings made on the website in this browser. */
  allBookings(): AdminBooking[] {
    const website: AdminBooking[] = bookingStore.all().map((b) => ({ ...b, channel: 'website', ...(b as Partial<AdminBooking>), origin: 'website' }));
    return [...website, ...this.load().bookings];
  },
  saveBooking(booking: AdminBooking): void {
    if (booking.origin === 'website') {
      // Keep the website's record shape; admin-only fields ride along and are ignored by the website.
      const { origin: _origin, ...rest } = booking;
      void _origin;
      bookingStore.save(rest);
      notify();
      return;
    }
    this.update((d) => {
      d.bookings = d.bookings.map((b) => (b.id === booking.id ? booking : b));
    });
  },
};
