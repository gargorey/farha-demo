import { ApiError, type BookingHistoryEntry, type BookingStatus, type Paginated } from '@/models';
import { todayISO } from '@/utils/dates';
import { adminStore } from '../data/admin-store';
import type {
  AdminApiClient,
  AdminBooking,
  BookingQuery,
  CustomerWithStats,
  DashboardSummary,
  ProviderWithStats,
  ReportData,
} from '../models';
import { ACTIONS, isRevenueStatus, needsAction } from '../utils/booking-actions';
import { buildDashboard, buildReport, round2 } from '../utils/analytics';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);
const digits = (phone: string) => phone.replace(/\D/g, '').slice(-9);

function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const start = (Math.max(1, page) - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

function mustGetBooking(id: string): AdminBooking {
  const b = adminStore.allBookings().find((x) => x.id === id || x.reference === id);
  if (!b) throw new ApiError('NOT_FOUND', 404, `Booking ${id} not found`);
  return b;
}

function serviceIndex() {
  return new Map(adminStore.load().services.map((s) => [s.id, s]));
}

function matchesQuery(b: AdminBooking, q: BookingQuery, services: ReturnType<typeof serviceIndex>): boolean {
  if (q.status === 'needs_action' ? !needsAction(b) : q.status && b.status !== q.status) return false;
  if (q.cityId && b.event.cityId !== q.cityId) return false;
  if (q.serviceId && b.selection.serviceId !== q.serviceId) return false;
  const svc = services.get(b.selection.serviceId);
  if (q.categoryId && svc?.categoryId !== q.categoryId) return false;
  if (q.providerId && svc?.providerId !== q.providerId) return false;
  if (q.from && b.event.date < q.from) return false;
  if (q.to && b.event.date > q.to) return false;
  if (q.customerId) {
    const c = findCustomer(q.customerId);
    if (!c || !sameCustomer(b, c.phone, c.email)) return false;
  }
  if (q.q) {
    const needle = q.q.trim().toLowerCase();
    const hay = [b.reference, b.customer.fullName, b.customer.phone, b.customer.email, b.event.venue, svc?.name.ar, svc?.name.en].join(' ').toLowerCase();
    if (!hay.includes(needle) && !(needle.replace(/\D/g, '').length >= 4 && digits(b.customer.phone).includes(needle.replace(/\D/g, '')))) return false;
  }
  return true;
}

const sameCustomer = (b: AdminBooking, phone: string, email: string) =>
  digits(b.customer.phone) === digits(phone) || b.customer.email.toLowerCase() === email.toLowerCase();

/** Stored customers plus customers who only exist through website bookings in this browser. */
function allCustomers(): CustomerWithStats[] {
  const data = adminStore.load();
  const bookings = adminStore.allBookings();
  const list: CustomerWithStats[] = data.customers.map((c) => ({ ...c, bookingCount: 0, totalSpent: 0 }));
  for (const b of bookings) {
    let c = list.find((x) => sameCustomer(b, x.phone, x.email));
    if (!c) {
      c = {
        id: `web-${digits(b.customer.phone)}`,
        fullName: b.customer.fullName,
        phone: b.customer.phone,
        email: b.customer.email,
        cityId: b.event.cityId,
        createdAt: b.createdAt,
        tags: [],
        blocked: false,
        bookingCount: 0,
        totalSpent: 0,
        fromWebsite: true,
      };
      list.push(c);
    }
    c.bookingCount++;
    if (isRevenueStatus(b.status)) c.totalSpent = round2(c.totalSpent + b.pricing.total);
    if (!c.lastBookingAt || b.createdAt > c.lastBookingAt) c.lastBookingAt = b.createdAt;
  }
  return list;
}

function findCustomer(id: string) {
  return allCustomers().find((c) => c.id === id);
}

export function createMockAdminClient(getActor: () => string, latencyMs = 180): AdminApiClient {
  const delay = () => sleep(latencyMs);

  function audit(action: string, target: string, detail?: string) {
    adminStore.update((d) => {
      d.audit = [{ id: crypto.randomUUID(), at: new Date().toISOString(), by: getActor(), action, target, detail }, ...d.audit].slice(0, 300);
    });
  }

  function pushHistory(b: AdminBooking, status: BookingStatus, noteKey: string, note?: string): AdminBooking {
    const at = new Date().toISOString();
    const entry: BookingHistoryEntry = { at, status, noteKey, ...(note ? { note } : {}) };
    return { ...b, status, updatedAt: at, history: [...b.history, entry] };
  }

  return {
    isDemo: true,

    // The demo signs in with an account picker (auth/session.tsx); no passwords.
    async signIn() {
      throw new ApiError('UNAUTHORIZED', 401);
    },
    async getMe() {
      throw new ApiError('UNAUTHORIZED', 401);
    },
    async signOut() {},
    async changePassword() {},
    async resetStaffPassword() {
      throw new ApiError('FORBIDDEN', 403);
    },

    async getDashboard(): Promise<DashboardSummary> {
      await delay();
      return clone(buildDashboard(adminStore.allBookings(), todayISO()));
    },

    async listBookings(query = {}) {
      await delay();
      const services = serviceIndex();
      const items = adminStore.allBookings().filter((b) => matchesQuery(b, query, services));
      const sort = query.sort ?? 'created-desc';
      items.sort((a, b) => {
        if (sort === 'event-asc') return (a.event.date + a.event.startTime).localeCompare(b.event.date + b.event.startTime);
        if (sort === 'event-desc') return (b.event.date + b.event.startTime).localeCompare(a.event.date + a.event.startTime);
        if (sort === 'total-desc') return b.pricing.total - a.pricing.total;
        return b.createdAt.localeCompare(a.createdAt);
      });
      return clone(paginate(items, query.page, query.pageSize));
    },

    async getBooking(id) {
      await delay();
      return clone(mustGetBooking(id));
    },

    async transitionBooking(id, action, note) {
      await delay();
      const b = mustGetBooking(id);
      const def = ACTIONS[action];
      if (!def.from.includes(b.status)) throw new ApiError('TRANSITION_NOT_ALLOWED', 409);
      if (action === 'complete' && b.event.date > todayISO()) throw new ApiError('TRANSITION_NOT_ALLOWED', 409, 'Event has not happened yet');
      let updated = b;
      // Confirming a brand-new request records the review step too, so the history stays complete.
      if (action === 'confirm' && b.status === 'pending_request') updated = pushHistory(updated, 'pending_confirmation', 'history.staffReviewing');
      updated = pushHistory(updated, def.to, def.noteKey, note?.trim() || undefined);
      if (def.to === 'cancelled' || def.to === 'completed') delete updated.modificationRequest;
      adminStore.saveBooking(updated);
      audit(`booking.${action}`, b.reference, note);
      return clone(updated);
    },

    async resolveModification(id, note) {
      await delay();
      const b = mustGetBooking(id);
      if (!b.modificationRequest) throw new ApiError('CONFLICT', 409);
      const updated = pushHistory(b, b.status, 'history.staffModificationHandled', note?.trim() || undefined);
      delete updated.modificationRequest;
      adminStore.saveBooking(updated);
      audit('booking.modification_handled', b.reference, note);
      return clone(updated);
    },

    async addBookingNote(id, text) {
      await delay();
      const b = mustGetBooking(id);
      const updated: AdminBooking = { ...b, internalNotes: [...(b.internalNotes ?? []), { at: new Date().toISOString(), by: getActor(), text: text.trim() }] };
      adminStore.saveBooking(updated);
      audit('booking.note', b.reference);
      return clone(updated);
    },

    async listServices() {
      await delay();
      return clone(adminStore.load().services);
    },
    async getService(id) {
      await delay();
      const s = adminStore.load().services.find((x) => x.id === id || x.slug === id);
      if (!s) throw new ApiError('NOT_FOUND', 404);
      return clone(s);
    },
    async updateService(id, patch) {
      await delay();
      const current = adminStore.load().services.find((x) => x.id === id);
      if (!current) throw new ApiError('NOT_FOUND', 404);
      const packages = patch.packages ?? current.packages;
      if (!packages.length) throw new ApiError('VALIDATION_ERROR', 422, 'At least one package', [{ field: 'packages', messageKey: 'validation.required' }]);
      const next = {
        ...current,
        ...patch,
        id: current.id,
        startingPrice: Math.min(...packages.map((p) => p.price)),
        durationMinutes: Math.min(...packages.map((p) => p.durationMinutes)),
        updatedAt: new Date().toISOString(),
      };
      adminStore.update((d) => {
        d.services = d.services.map((s) => (s.id === id ? next : s));
      });
      audit('service.update', current.name.en);
      return clone(next);
    },

    async listCategories() {
      await delay();
      return clone([...adminStore.load().categories].sort((a, b) => a.sortOrder - b.sortOrder));
    },
    async saveCategory(category) {
      await delay();
      adminStore.update((d) => {
        const exists = d.categories.some((c) => c.id === category.id);
        d.categories = exists ? d.categories.map((c) => (c.id === category.id ? category : c)) : [...d.categories, category];
      });
      audit('category.save', category.name.en);
      return clone(category);
    },

    async listProviders() {
      await delay();
      const data = adminStore.load();
      const bookings = adminStore.allBookings();
      return clone(
        data.providers.map<ProviderWithStats>((p) => {
          const svcs = data.services.filter((s) => s.providerId === p.id);
          const ids = new Set(svcs.map((s) => s.id));
          const mine = bookings.filter((b) => ids.has(b.selection.serviceId));
          const rated = svcs.filter((s) => s.reviewCount > 0);
          return {
            ...p,
            serviceCount: svcs.length,
            bookingCount: mine.length,
            revenue: round2(mine.filter((b) => isRevenueStatus(b.status)).reduce((s, b) => s + b.pricing.total, 0)),
            rating: rated.length ? Math.round((rated.reduce((s, x) => s + x.rating, 0) / rated.length) * 10) / 10 : 0,
          };
        }),
      );
    },
    async saveProvider(provider) {
      await delay();
      if (!provider.name.ar.trim() || !provider.name.en.trim()) throw new ApiError('VALIDATION_ERROR', 422);
      adminStore.update((d) => {
        const exists = d.providers.some((p) => p.id === provider.id);
        d.providers = exists ? d.providers.map((p) => (p.id === provider.id ? provider : p)) : [...d.providers, provider];
      });
      audit('provider.save', provider.name.en);
      return clone(provider);
    },

    async listCustomers(query = {}) {
      await delay();
      let list = allCustomers();
      if (query.tag) list = list.filter((c) => (query.tag === 'website' ? c.fromWebsite : c.tags.includes(query.tag!)));
      if (query.q) {
        const n = query.q.trim().toLowerCase();
        list = list.filter((c) => [c.fullName, c.email, c.phone].join(' ').toLowerCase().includes(n));
      }
      list.sort((a, b) => (b.lastBookingAt ?? '').localeCompare(a.lastBookingAt ?? ''));
      return clone(paginate(list, query.page, query.pageSize));
    },
    async getCustomer(id) {
      await delay();
      const c = findCustomer(id);
      if (!c) throw new ApiError('NOT_FOUND', 404);
      return clone(c);
    },
    async updateCustomer(id, patch) {
      await delay();
      const c = findCustomer(id);
      if (!c) throw new ApiError('NOT_FOUND', 404);
      adminStore.update((d) => {
        const { bookingCount: _a, totalSpent: _b, lastBookingAt: _c, fromWebsite: _d, ...base } = { ...c, ...patch };
        void [_a, _b, _c, _d];
        const exists = d.customers.some((x) => x.id === id);
        d.customers = exists ? d.customers.map((x) => (x.id === id ? base : x)) : [...d.customers, base];
      });
      audit('customer.update', c.fullName);
      return clone(findCustomer(id)!);
    },

    async getPricingSettings() {
      await delay();
      return clone(adminStore.load().settings);
    },
    async updatePricingSettings(settings) {
      await delay();
      const bad =
        settings.vat.rate < 0 || settings.vat.rate > 1 || settings.minLeadDays < 0 || settings.cancellationCutoffHours < 0 || settings.modificationCutoffHours < 0;
      if (bad) throw new ApiError('VALIDATION_ERROR', 422);
      adminStore.update((d) => {
        d.settings = settings;
      });
      audit('pricing.update', `VAT ${Math.round(settings.vat.rate * 100)}%`);
      return clone(settings);
    },

    async listPromotions() {
      await delay();
      return clone(adminStore.load().promotions);
    },
    async savePromotion(promo) {
      await delay();
      const code = promo.code.trim().toUpperCase();
      const clash = adminStore.load().promotions.some((p) => p.code === code && p.id !== promo.id);
      if (clash) throw new ApiError('CONFLICT', 409, 'Code already exists', [{ field: 'code', messageKey: 'admin.promotions.codeTaken' }]);
      const saved = { ...promo, code };
      adminStore.update((d) => {
        const exists = d.promotions.some((p) => p.id === promo.id);
        d.promotions = exists ? d.promotions.map((p) => (p.id === promo.id ? saved : p)) : [saved, ...d.promotions];
      });
      audit('promotion.save', code);
      return clone(saved);
    },
    async deletePromotion(id) {
      await delay();
      const p = adminStore.load().promotions.find((x) => x.id === id);
      adminStore.update((d) => {
        d.promotions = d.promotions.filter((x) => x.id !== id);
      });
      if (p) audit('promotion.delete', p.code);
    },

    async getReport({ from, to }): Promise<ReportData> {
      await delay();
      const data = adminStore.load();
      const ctx = {
        services: new Map(data.services.map((s) => [s.id, { categoryId: s.categoryId, providerId: s.providerId }])),
        commissionRates: new Map(data.providers.map((p) => [p.id, p.commissionRate])),
        defaultCommissionRate: data.settings.defaultCommissionRate,
      };
      return clone(buildReport(adminStore.allBookings(), ctx, from, to));
    },

    async listStaff() {
      await delay();
      return clone(adminStore.load().staff);
    },
    async saveStaff(user) {
      await delay();
      if (!user.name.trim() || !/^\S+@\S+\.\S+$/.test(user.email)) throw new ApiError('VALIDATION_ERROR', 422);
      adminStore.update((d) => {
        const exists = d.staff.some((u) => u.id === user.id);
        d.staff = exists ? d.staff.map((u) => (u.id === user.id ? user : u)) : [...d.staff, user];
      });
      audit('staff.save', user.email, user.role);
      return clone(user);
    },
    async listAudit(limit = 50) {
      await delay();
      return clone(adminStore.load().audit.slice(0, limit));
    },
  };
}
