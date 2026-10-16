import type { LocalizedText, MediaItem, Money, Motif } from './common';

export interface ServiceCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  motif: Motif;
  sortOrder: number;
}

export interface EventType {
  id: string;
  name: LocalizedText;
  icon: string;
}

export interface City {
  id: string;
  name: LocalizedText;
  region: LocalizedText;
  /** Configurable travel/transport charge applied for this city (demo assumption). */
  travelFee: Money;
}

export type AudienceAge = 'toddlers' | 'kids' | 'teens' | 'adults' | 'all';
export type EntertainmentStyle = 'calm' | 'interactive' | 'high-energy' | 'educational' | 'elegant';

export interface ServicePackage {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  price: Money;
  durationMinutes: number;
  maxAttendees: number;
  includes: LocalizedText[];
  popular?: boolean;
}

export interface ServiceAddOn {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  price: Money;
  /** When true the customer can choose a quantity (e.g. per extra character). */
  quantifiable: boolean;
  maxQuantity: number;
}

export interface Review {
  id: string;
  author: LocalizedText;
  rating: number;
  comment: LocalizedText;
  date: string;
  eventType: string;
}

export interface FaqItem {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface Service {
  id: string;
  slug: string;
  categoryId: string;
  /** Fictional provider name (demo content). */
  providerName: LocalizedText;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  media: MediaItem[];
  startingPrice: Money;
  durationMinutes: number;
  /** Charge per additional hour beyond the package duration, if the service allows it. */
  extraHourPrice?: Money;
  maxExtraHours: number;
  eventTypeIds: string[];
  cityIds: string[];
  audience: AudienceAge[];
  ageRange: { min: number; max?: number };
  styles: EntertainmentStyle[];
  packages: ServicePackage[];
  addOns: ServiceAddOn[];
  requirements: LocalizedText[];
  reviews: Review[];
  faqs: FaqItem[];
  rating: number;
  reviewCount: number;
  bookingsCount: number;
  featured?: boolean;
  tags: string[];
}

export type ServiceSort = 'relevance' | 'price-asc' | 'price-desc' | 'popularity' | 'rating';

export interface ServiceQuery {
  q?: string;
  categoryIds?: string[];
  eventTypeId?: string;
  cityId?: string;
  minPrice?: number;
  maxPrice?: number;
  maxDurationMinutes?: number;
  minDurationMinutes?: number;
  audience?: AudienceAge;
  style?: EntertainmentStyle;
  attendees?: number;
  sort?: ServiceSort;
}

export type AvailabilityState = 'available' | 'limited' | 'unavailable' | 'unverified';

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  state: AvailabilityState;
  /** Suggested start times (HH:mm) when available. */
  slots: string[];
}

export interface AvailabilityQuery {
  serviceId: string;
  from: string;
  to: string;
  cityId?: string;
}
