import type { Booking, BookingStatus, LocalizedText, Money, Paginated, Service, ServiceCategory } from '@/models';

/**
 * Admin-side data shapes (Project 3). They extend the customer-facing models in
 * src/models so the backend (Project 2) can serve both apps from one schema.
 * See docs/05-admin-dashboard.md for the matching /api/v1/admin endpoints.
 */

export type RoleId = 'admin' | 'operations' | 'finance' | 'viewer';

export const PERMISSIONS = [
  'bookings.manage',
  'catalog.manage',
  'providers.manage',
  'customers.manage',
  'pricing.manage',
  'promotions.manage',
  'reports.view',
  'staff.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  active: boolean;
  lastActiveAt?: string;
}

export type BookingChannel = 'website' | 'whatsapp' | 'phone';

export interface InternalNote {
  at: string;
  by: string;
  text: string;
}

export interface AdminBooking extends Booking {
  channel?: BookingChannel;
  internalNotes?: InternalNote[];
  /** Where the record lives in the demo: generated sample data, or made on the website in this browser. */
  origin: 'sample' | 'website';
}

export type BookingAction = 'start_review' | 'confirm' | 'reject' | 'complete' | 'approve_cancellation' | 'decline_cancellation';

export interface BookingQuery {
  q?: string;
  status?: BookingStatus | 'needs_action';
  cityId?: string;
  serviceId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  customerId?: string;
  providerId?: string;
  sort?: 'event-asc' | 'event-desc' | 'created-desc' | 'total-desc';
  page?: number;
  pageSize?: number;
}

export interface AdminService extends Service {
  providerId: string;
  active: boolean;
  updatedAt: string;
}

export interface AdminCategory extends ServiceCategory {
  active: boolean;
}

export type ProviderStatus = 'active' | 'pending' | 'suspended';

export interface Provider {
  id: string;
  name: LocalizedText;
  contactName: string;
  phone: string;
  email: string;
  cityIds: string[];
  status: ProviderStatus;
  /** Platform commission taken on the booking subtotal (0.15 = 15%). */
  commissionRate: number;
  joinedAt: string;
  notes?: string;
}

export interface ProviderWithStats extends Provider {
  serviceCount: number;
  bookingCount: number;
  revenue: Money;
  rating: number;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  cityId: string;
  createdAt: string;
  tags: string[];
  notes?: string;
  blocked: boolean;
}

export interface CustomerWithStats extends Customer {
  bookingCount: number;
  totalSpent: Money;
  lastBookingAt?: string;
  /** True when the customer only exists because of a website booking made in this browser. */
  fromWebsite?: boolean;
}

export interface CustomerQuery {
  q?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export interface PricingSettings {
  vat: { enabled: boolean; rate: number; pricesIncludeVat: boolean };
  applyTravelFee: boolean;
  travelFees: Record<string, Money>;
  minLeadDays: number;
  maxAdvanceDays: number;
  cancellationCutoffHours: number;
  modificationCutoffHours: number;
  freeWithdrawalBeforeConfirmation: boolean;
  defaultCommissionRate: number;
}

export type PromotionKind = 'percent' | 'fixed';

export interface Promotion {
  id: string;
  code: string;
  name: LocalizedText;
  kind: PromotionKind;
  value: number;
  minSubtotal: Money;
  startsOn: string;
  endsOn: string;
  maxUses?: number;
  uses: number;
  active: boolean;
  categoryIds: string[];
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  target: string;
  detail?: string;
}

export interface DashboardSummary {
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  revenueThisMonth: Money;
  revenueLastMonth: Money;
  needsAction: number;
  upcoming7Days: number;
  actionQueue: AdminBooking[];
  upcoming: AdminBooking[];
  revenueByMonth: { month: string; revenue: Money; bookings: number }[];
  statusCounts: Record<BookingStatus, number>;
}

export interface ReportQuery {
  from: string;
  to: string;
}

export interface ReportData {
  range: ReportQuery;
  bookings: number;
  confirmedBookings: number;
  grossRevenue: Money;
  netRevenue: Money;
  vatCollected: Money;
  commission: Money;
  averageBookingValue: Money;
  cancellationRate: number;
  byMonth: { month: string; revenue: Money; bookings: number }[];
  byCategory: { id: string; revenue: Money; bookings: number }[];
  byCity: { id: string; revenue: Money; bookings: number }[];
  byEventType: { id: string; revenue: Money; bookings: number }[];
  topServices: { id: string; revenue: Money; bookings: number }[];
  byChannel: { id: BookingChannel; bookings: number }[];
}

export interface StaffSessionInfo {
  user: StaffUser;
  /** True after an administrator created or reset the account: a new password must be chosen first. */
  mustChangePassword: boolean;
}

export interface AdminApiClient {
  readonly isDemo: boolean;

  /** Staff sign-in (backend only; the demo uses an account picker). */
  signIn(email: string, password: string): Promise<StaffSessionInfo>;
  getMe(): Promise<StaffSessionInfo>;
  signOut(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  getDashboard(): Promise<DashboardSummary>;

  listBookings(query?: BookingQuery): Promise<Paginated<AdminBooking>>;
  getBooking(id: string): Promise<AdminBooking>;
  transitionBooking(id: string, action: BookingAction, note?: string): Promise<AdminBooking>;
  resolveModification(id: string, note?: string): Promise<AdminBooking>;
  addBookingNote(id: string, text: string): Promise<AdminBooking>;

  listServices(): Promise<AdminService[]>;
  getService(id: string): Promise<AdminService>;
  updateService(id: string, patch: Partial<AdminService>): Promise<AdminService>;
  listCategories(): Promise<AdminCategory[]>;
  saveCategory(category: AdminCategory): Promise<AdminCategory>;

  listProviders(): Promise<ProviderWithStats[]>;
  saveProvider(provider: Provider): Promise<Provider>;

  listCustomers(query?: CustomerQuery): Promise<Paginated<CustomerWithStats>>;
  getCustomer(id: string): Promise<CustomerWithStats>;
  updateCustomer(id: string, patch: Partial<Customer>): Promise<CustomerWithStats>;

  getPricingSettings(): Promise<PricingSettings>;
  updatePricingSettings(settings: PricingSettings): Promise<PricingSettings>;

  listPromotions(): Promise<Promotion[]>;
  savePromotion(promotion: Promotion): Promise<Promotion>;
  deletePromotion(id: string): Promise<void>;

  getReport(query: ReportQuery): Promise<ReportData>;

  listStaff(): Promise<StaffUser[]>;
  /** A new account comes back once with `temporaryPassword` (backend only). */
  saveStaff(user: StaffUser): Promise<StaffUser & { temporaryPassword?: string }>;
  resetStaffPassword(id: string): Promise<{ temporaryPassword: string }>;
  listAudit(limit?: number): Promise<AuditEntry[]>;
}
