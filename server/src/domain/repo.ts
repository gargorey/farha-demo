import type { Booking, City, EventType, Service, ServiceCategory } from '@/models';
import type { AdminBooking, AdminCategory, AdminService, PricingSettings, Promotion, Provider } from '@/admin/models';
import type { Queryable } from '../db/pool';
import { notFound } from '../lib/errors';

/** Row ↔ API shape mapping and small read helpers shared by the routes. */

export async function getSettings(db: Queryable): Promise<PricingSettings> {
  const { rows } = await db.query<{ data: PricingSettings }>('SELECT data FROM settings WHERE id = 1');
  if (!rows[0]) throw new Error('Settings row missing: run `npm run db:seed`');
  return rows[0].data;
}

export async function listCities(db: Queryable, settings: PricingSettings): Promise<City[]> {
  const { rows } = await db.query('SELECT id, name, region FROM cities ORDER BY sort_order, id');
  return rows.map((r) => ({ id: r.id, name: r.name, region: r.region, travelFee: settings.travelFees[r.id] ?? 0 }));
}

export async function listEventTypes(db: Queryable): Promise<EventType[]> {
  const { rows } = await db.query('SELECT id, name, icon FROM event_types ORDER BY sort_order, id');
  return rows;
}

const toCategory = (r: { id: string; slug: string; sort_order: number; active: boolean; data: Omit<ServiceCategory, 'id' | 'slug' | 'sortOrder'> }): AdminCategory => ({
  ...r.data,
  id: r.id,
  slug: r.slug,
  sortOrder: r.sort_order,
  active: r.active,
});

export async function listCategories(db: Queryable, activeOnly: boolean): Promise<AdminCategory[]> {
  const { rows } = await db.query(`SELECT * FROM categories ${activeOnly ? 'WHERE active' : ''} ORDER BY sort_order, id`);
  return rows.map(toCategory);
}

export const publicCategory = ({ active: _a, ...c }: AdminCategory): ServiceCategory => (void _a, c);

interface ServiceRow {
  id: string;
  slug: string;
  category_id: string;
  provider_id: string;
  active: boolean;
  data: Service;
  updated_at: Date;
}

const toService = (r: ServiceRow): AdminService => ({
  ...r.data,
  id: r.id,
  slug: r.slug,
  categoryId: r.category_id,
  providerId: r.provider_id,
  active: r.active,
  updatedAt: r.updated_at.toISOString(),
});

/**
 * Services. `publicOnly` returns what customers may see: active services in an
 * active category whose provider is active.
 */
export async function loadServices(db: Queryable, publicOnly: boolean): Promise<AdminService[]> {
  const where = publicOnly
    ? `WHERE s.active AND EXISTS (SELECT 1 FROM categories c WHERE c.id = s.category_id AND c.active)
         AND EXISTS (SELECT 1 FROM providers p WHERE p.id = s.provider_id AND p.status = 'active')`
    : '';
  const { rows } = await db.query<ServiceRow>(`SELECT s.* FROM services s ${where} ORDER BY s.id`);
  return rows.map(toService);
}

export async function findService(db: Queryable, idOrSlug: string, publicOnly: boolean): Promise<AdminService> {
  const all = await loadServices(db, publicOnly);
  const s = all.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
  if (!s) throw notFound('Service not found');
  return s;
}

/** Customers never see which provider record or internal flags sit behind a service. */
export function publicService(s: AdminService): Service {
  const { providerId: _p, active: _a, updatedAt: _u, ...rest } = s;
  void [_p, _a, _u];
  return rest;
}

export const toProvider = (r: { id: string; status: Provider['status']; commission_rate: number; data: Omit<Provider, 'id' | 'status' | 'commissionRate'> }): Provider => ({
  ...r.data,
  id: r.id,
  status: r.status,
  commissionRate: r.commission_rate,
});

export const toPromotion = (r: { id: string; code: string; active: boolean; data: Omit<Promotion, 'id' | 'code' | 'active'> }): Promotion => ({
  ...r.data,
  id: r.id,
  code: r.code,
  active: r.active,
});

export interface BookingRow {
  id: string;
  reference: string;
  status: AdminBooking['status'];
  customer_id: string;
  channel: NonNullable<AdminBooking['channel']>;
  origin: AdminBooking['origin'];
  selection: AdminBooking['selection'];
  event: AdminBooking['event'];
  customer: AdminBooking['customer'];
  pricing: AdminBooking['pricing'];
  history: AdminBooking['history'];
  modification_request: AdminBooking['modificationRequest'] | null;
  internal_notes: NonNullable<AdminBooking['internalNotes']>;
  created_at: Date;
  updated_at: Date;
}

export function toAdminBooking(r: BookingRow, demoMode: boolean): AdminBooking {
  return {
    id: r.id,
    reference: r.reference,
    isDemo: demoMode || r.origin === 'sample',
    status: r.status,
    selection: r.selection,
    event: r.event,
    customer: r.customer,
    pricing: r.pricing,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    history: r.history,
    ...(r.modification_request ? { modificationRequest: r.modification_request } : {}),
    channel: r.channel,
    internalNotes: r.internal_notes,
    origin: r.origin,
  };
}

/** What a customer sees of their booking: no staff notes or internal fields. */
export function customerBooking(b: AdminBooking): Booking {
  const { channel: _c, internalNotes: _n, origin: _o, ...rest } = b;
  void [_c, _n, _o];
  return rest;
}
