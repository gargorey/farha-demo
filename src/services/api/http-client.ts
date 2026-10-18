import { ApiError, type ApiErrorCode } from '@/models';
import type { ApiClient } from './client';

/**
 * REST client for the backend (server/). Used when VITE_API_MODE=http.
 * Session cookies are httpOnly and sent with `credentials: 'include'`.
 */
export function createHttpClient(baseUrl: string, getLocale: () => string): ApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          'Accept-Language': getLocale(),
          ...(init.headers ?? {}),
        },
        credentials: 'include',
      });
    } catch {
      throw new ApiError('NETWORK_ERROR', 0);
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { code?: ApiErrorCode; message?: string; fieldErrors?: [] };
      throw new ApiError(body.code ?? (res.status === 404 ? 'NOT_FOUND' : res.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN'), res.status, body.message, body.fieldErrors);
    }
    return (await res.json()) as T;
  }

  const qs = (params: Record<string, unknown>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') continue;
      sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : '';
  };

  return {
    isDemo: false,
    listServices: (query = {}) => request(`/services${qs({ ...query })}`),
    getService: (idOrSlug) => request(`/services/${encodeURIComponent(idOrSlug)}`),
    listCategories: () => request('/categories'),
    listEventTypes: () => request('/event-types'),
    listCities: () => request('/cities'),
    getAvailability: ({ serviceId, ...rest }) =>
      request(`/services/${encodeURIComponent(serviceId)}/availability${qs(rest)}`),
    createBooking: ({ idempotencyKey, ...body }) =>
      request('/bookings', { method: 'POST', body: JSON.stringify(body), headers: { 'Idempotency-Key': idempotencyKey } }),
    getBooking: (id) => request(`/bookings/${encodeURIComponent(id)}`),
    listBookings: () => request<{ items: never[] }>('/bookings').then((r) => r.items),
    requestModification: (id, body) =>
      request(`/bookings/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ modificationRequest: body }) }),
    requestCancellation: (id, body) =>
      request(`/bookings/${encodeURIComponent(id)}/cancellation-requests`, { method: 'POST', body: JSON.stringify(body) }),
    sendContactMessage: (body) => request('/contact-messages', { method: 'POST', body: JSON.stringify(body) }),
    getPublicSettings: () => request('/settings'),
    getCustomerSession: () => request('/auth/session'),
    requestSignInCode: (phone) => request('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }),
    verifySignInCode: (phone, code) => request('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }),
    signOut: () => request<unknown>('/auth/logout', { method: 'POST', body: '{}' }).then(() => undefined),
  };
}
