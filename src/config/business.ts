/**
 * Business rules used by the demo.
 *
 * Every value here is a CONFIGURABLE ASSUMPTION pending business approval
 * (see docs/01-business-analysis.md, "Assumptions"). None of them is an
 * approved company policy. In Project 2 these should come from the backend.
 */
export const businessConfig = {
  brand: {
    name: { ar: 'فرحة', en: 'Farha' },
    tagline: { ar: 'منصة حجز الترفيه للمناسبات', en: 'Entertainment booking for every occasion' },
  },
  contact: {
    phone: '+966 11 000 0000',
    whatsapp: '+966 50 000 0000',
    email: 'hello@farha.example',
    hours: { ar: 'الأحد – الخميس، ٩ص – ٩م', en: 'Sun – Thu, 9 AM – 9 PM' },
    city: { ar: 'الرياض، المملكة العربية السعودية', en: 'Riyadh, Saudi Arabia' },
  },
  currency: 'SAR' as const,
  pricing: {
    /** Saudi VAT is 15%; whether listed prices include it is an open business decision. */
    vat: { enabled: true, rate: 0.15, pricesIncludeVat: false },
    /** Travel fees are configured per city in the mock data. */
    applyTravelFee: true,
    /** No discounts are configured for the demo. */
    discounts: [] as { code: string; percent: number }[],
  },
  booking: {
    /** Earliest bookable date, in days from today (lead time). */
    minLeadDays: 2,
    /** Latest bookable date, in days from today. */
    maxAdvanceDays: 180,
    /** Availability beyond this many days is shown as "not verified". */
    verifiedAvailabilityDays: 60,
    defaultStartTimes: ['10:00', '13:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
    maxAttendees: 1000,
  },
  policy: {
    /** Customer may withdraw a request freely before the provider confirms it. */
    freeWithdrawalBeforeConfirmation: true,
    /** Cancellation can be requested online up to this many hours before the event. */
    cancellationCutoffHours: 48,
    /** Modification can be requested online up to this many hours before the event. */
    modificationCutoffHours: 72,
  },
} as const;

export type BusinessConfig = typeof businessConfig;
