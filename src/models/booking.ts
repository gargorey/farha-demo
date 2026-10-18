import type { Money } from './common';

export const BOOKING_STATUSES = [
  'draft',
  'pending_request',
  'pending_confirmation',
  'confirmed',
  'completed',
  'cancellation_requested',
  'cancelled',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type ContactMethod = 'phone' | 'whatsapp' | 'email';

export interface CustomerDetails {
  fullName: string;
  /** E.164 format, e.g. +966512345678 */
  phone: string;
  email: string;
  contactMethod: ContactMethod;
}

export interface EventDetails {
  eventTypeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  extraHours: number;
  cityId: string;
  venue: string;
  attendees: number;
  notes?: string;
}

export interface SelectedAddOn {
  addOnId: string;
  quantity: number;
}

export interface BookingSelection {
  serviceId: string;
  packageId: string;
  addOns: SelectedAddOn[];
}

export type PriceLineKind = 'package' | 'addon' | 'extra-hours' | 'travel' | 'discount' | 'vat';

export interface PriceLine {
  kind: PriceLineKind;
  /** i18n key for the label */
  labelKey: string;
  /** Dynamic label parameters / localized names */
  labelParams?: Record<string, string | number>;
  quantity?: number;
  unitPrice?: Money;
  amount: Money;
}

export interface PricingBreakdown {
  currency: 'SAR';
  lines: PriceLine[];
  subtotal: Money;
  discountTotal: Money;
  vat: Money;
  vatRate: number;
  total: Money;
  /** True when the amount is an estimate pending provider/backend confirmation. */
  isEstimate: boolean;
}

export interface BookingHistoryEntry {
  at: string; // ISO timestamp
  status: BookingStatus;
  /** i18n key describing the event */
  noteKey: string;
  note?: string;
}

export interface Booking {
  id: string;
  reference: string;
  /** True for demo records (browser-only or sample data); false for bookings stored by the backend. */
  isDemo: boolean;
  status: BookingStatus;
  selection: BookingSelection;
  event: EventDetails;
  customer: CustomerDetails;
  pricing: PricingBreakdown;
  createdAt: string;
  updatedAt: string;
  history: BookingHistoryEntry[];
  modificationRequest?: { message: string; requestedAt: string };
}

export interface CreateBookingRequest {
  selection: BookingSelection;
  event: EventDetails;
  customer: CustomerDetails;
  /** Client-generated key so retries never create duplicate bookings. */
  idempotencyKey: string;
}

export interface ModificationRequest {
  message: string;
}

export interface CancellationRequest {
  reason?: string;
}
