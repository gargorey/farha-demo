import { ApiError, type ApiErrorCode } from '@/models';
import type { AdminApiClient } from '../models';

/**
 * REST implementation for the future backend (Project 2), under /api/v1/admin.
 * NOT exercised in the demo; it exists so VITE_API_MODE=http switches the
 * dashboard over without touching pages. Endpoints: docs/05-admin-dashboard.md.
 */
export function createHttpAdminClient(baseUrl: string, getLocale: () => string): AdminApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/admin${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'Accept-Language': getLocale(), ...(init.headers ?? {}) },
        credentials: 'include',
      });
    } catch {
      throw new ApiError('NETWORK_ERROR', 0);
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { code?: ApiErrorCode; message?: string; fieldErrors?: [] };
      throw new ApiError(body.code ?? (res.status === 404 ? 'NOT_FOUND' : 'UNKNOWN'), res.status, body.message, body.fieldErrors);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }
  const qs = (params: object) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : '';
  };
  const id = encodeURIComponent;
  const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

  return {
    isDemo: false,
    getDashboard: () => request('/dashboard'),
    listBookings: (q = {}) => request(`/bookings${qs(q)}`),
    getBooking: (bid) => request(`/bookings/${id(bid)}`),
    transitionBooking: (bid, action, note) => request(`/bookings/${id(bid)}/transitions`, json('POST', { action, note })),
    resolveModification: (bid, note) => request(`/bookings/${id(bid)}/modification-request/resolve`, json('POST', { note })),
    addBookingNote: (bid, text) => request(`/bookings/${id(bid)}/notes`, json('POST', { text })),
    listServices: () => request('/services'),
    getService: (sid) => request(`/services/${id(sid)}`),
    updateService: (sid, patch) => request(`/services/${id(sid)}`, json('PATCH', patch)),
    listCategories: () => request('/categories'),
    saveCategory: (c) => request(`/categories/${id(c.id)}`, json('PUT', c)),
    listProviders: () => request('/providers'),
    saveProvider: (p) => request(`/providers/${id(p.id)}`, json('PUT', p)),
    listCustomers: (q = {}) => request(`/customers${qs(q)}`),
    getCustomer: (cid) => request(`/customers/${id(cid)}`),
    updateCustomer: (cid, patch) => request(`/customers/${id(cid)}`, json('PATCH', patch)),
    getPricingSettings: () => request('/pricing'),
    updatePricingSettings: (s) => request('/pricing', json('PUT', s)),
    listPromotions: () => request('/promotions'),
    savePromotion: (p) => request(`/promotions/${id(p.id)}`, json('PUT', p)),
    deletePromotion: (pid) => request(`/promotions/${id(pid)}`, { method: 'DELETE' }),
    getReport: (q) => request(`/reports/summary${qs(q)}`),
    listStaff: () => request('/staff'),
    saveStaff: (u) => request(`/staff/${id(u.id)}`, json('PUT', u)),
    listAudit: (limit = 50) => request(`/audit-log${qs({ limit })}`),
  };
}
