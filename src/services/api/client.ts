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
}
