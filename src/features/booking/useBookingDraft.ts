import { useCallback, useEffect, useState } from 'react';
import type { ContactMethod, SelectedAddOn } from '@/models';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';

export const BOOKING_STEPS = ['package', 'event', 'customize', 'contact', 'review'] as const;
export type BookingStep = (typeof BOOKING_STEPS)[number];

export interface BookingDraft {
  serviceId: string;
  step: number;
  packageId: string;
  addOns: SelectedAddOn[];
  event: {
    eventTypeId: string;
    date: string;
    startTime: string;
    extraHours: number;
    cityId: string;
    venue: string;
    attendees: number | '';
    notes: string;
  };
  customer: { fullName: string; phone: string; email: string; contactMethod: ContactMethod };
  /** One key per submission attempt; reused on retry so the request is never duplicated. */
  idempotencyKey: string;
}

const key = (serviceId: string) => `farha.bookingDraft.${serviceId}`;

export function emptyDraft(serviceId: string, init: Partial<BookingDraft['event']> & { packageId?: string } = {}): BookingDraft {
  const { packageId = '', ...event } = init;
  return {
    serviceId,
    step: packageId ? 1 : 0,
    packageId,
    addOns: [],
    event: { eventTypeId: '', date: '', startTime: '', extraHours: 0, cityId: '', venue: '', attendees: '', notes: '', ...event },
    customer: { fullName: '', phone: '', email: '', contactMethod: 'whatsapp' },
    idempotencyKey: crypto.randomUUID(),
  };
}

/**
 * Booking form state shared by all steps. Kept in sessionStorage (cleared when
 * the tab closes) so going back, or refreshing, never loses what was typed.
 */
export function useBookingDraft(serviceId: string, init: () => BookingDraft) {
  const [draft, setDraft] = useState<BookingDraft>(() => {
    const saved = readJSON<BookingDraft | null>(key(serviceId), null, 'session');
    const fresh = init();
    if (!saved) return fresh;
    // A package chosen on the details page wins over an older saved choice.
    return fresh.packageId && fresh.packageId !== saved.packageId ? { ...saved, packageId: fresh.packageId, step: Math.max(saved.step, 1) } : saved;
  });

  useEffect(() => writeJSON(key(serviceId), draft, 'session'), [serviceId, draft]);

  const update = useCallback((patch: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const clear = useCallback(() => removeKey(key(serviceId), 'session'), [serviceId]);
  const reset = useCallback(() => setDraft(init()), [init]);

  return { draft, update, clear, reset };
}
