import type {
  AvailabilityQuery,
  Booking,
  CancellationRequest,
  City,
  CreateBookingRequest,
  DayAvailability,
  EventType,
  ModificationRequest,
  Paginated,
  Service,
  ServiceCategory,
  ServiceQuery,
} from '@/models';

export interface ContactMessage {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

/** Business rules the backend sends so the website's estimates and date limits match it. */
export interface PublicSettings {
  vat: { enabled: boolean; rate: number; pricesIncludeVat: boolean };
  applyTravelFee: boolean;
  minLeadDays: number;
  maxAdvanceDays: number;
  cancellationCutoffHours: number;
  modificationCutoffHours: number;
  freeWithdrawalBeforeConfirmation: boolean;
  /** True when the backend runs as a demo (sample data, codes shown on screen). */
  demo: boolean;
}

/** Customer sign-in state: a phone number verified with a one-time code. */
export interface CustomerSessionInfo {
  verified: boolean;
  phone?: string;
}

/**
 * The contract between the customer website and the backend (Project 2).
 * Pages and hooks depend only on this interface, never on a specific implementation.
 * See docs/03-api-contract.md for the matching REST endpoints.
 */
export interface ApiClient {
  /** True when responses are simulated in the browser. */
  readonly isDemo: boolean;
  listServices(query?: ServiceQuery): Promise<Paginated<Service>>;
  /** Accepts an id or a URL slug. */
  getService(idOrSlug: string): Promise<Service>;
  listCategories(): Promise<ServiceCategory[]>;
  listEventTypes(): Promise<EventType[]>;
  listCities(): Promise<City[]>;
  getAvailability(query: AvailabilityQuery): Promise<DayAvailability[]>;
  createBooking(request: CreateBookingRequest): Promise<Booking>;
  getBooking(id: string): Promise<Booking>;
  listBookings(): Promise<Booking[]>;
  requestModification(id: string, request: ModificationRequest): Promise<Booking>;
  requestCancellation(id: string, request: CancellationRequest): Promise<Booking>;
  sendContactMessage(message: ContactMessage): Promise<{ id: string }>;

  /** Null in the browser demo (it uses the values in src/config/business.ts). */
  getPublicSettings(): Promise<PublicSettings | null>;
  getCustomerSession(): Promise<CustomerSessionInfo>;
  /** Sends a one-time code by SMS. `demoCode` is only returned by demo deployments. */
  requestSignInCode(phone: string): Promise<{ sent: boolean; demoCode?: string }>;
  verifySignInCode(phone: string, code: string): Promise<CustomerSessionInfo>;
  signOut(): Promise<void>;
}
