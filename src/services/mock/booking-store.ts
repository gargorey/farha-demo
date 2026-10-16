import type { Booking } from '@/models';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';

/**
 * DEMO persistence: bookings live only in this browser's localStorage.
 * Not secure, not shared across devices, and not suitable for real customer data.
 */
const KEY = 'farha.demo.bookings.v1';

export const bookingStore = {
  all(): Booking[] {
    return readJSON<Booking[]>(KEY, []);
  },
  get(id: string): Booking | undefined {
    return this.all().find((b) => b.id === id || b.reference === id);
  },
  save(booking: Booking): void {
    const list = this.all().filter((b) => b.id !== booking.id);
    writeJSON(KEY, [booking, ...list]);
  },
  clear(): void {
    removeKey(KEY);
  },
};
