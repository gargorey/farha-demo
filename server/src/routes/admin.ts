import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Paginated } from '@/models';
import type { AdminBooking, CustomerWithStats, ProviderWithStats, StaffUser } from '@/admin/models';
import { buildDashboard, buildReport, dashboardWindowStart, monthOf, round2 } from '@/admin/utils/analytics';
import { ACTIONS } from '@/admin/utils/booking-actions';
import { addDays, todayISO } from '@/utils/dates';
import type { AppContext } from '../app';
import { tx, type Queryable } from '../db/pool';
import { getSettings, listCategories, loadServices, toAdminBooking, toPromotion, toProvider, type BookingRow } from '../domain/repo';
import { audit } from '../lib/audit';
import {
  createStaffSession,
  getStaff,
  requireStaff,
  revokeStaffSessions,
  STAFF_COOKIE,
  cookieOptions,
} from '../lib/auth';
import { AppError, notFound } from '../lib/errors';
import * as S from '../lib/schemas';
import { hashPassword, passwordProblem, temporaryPassword, verifyPassword } from '../lib/security';

const REVENUE = ['confirmed', 'completed', 'cancellation_requested'];
const OPEN = ['pending_request', 'pending_confirmation', 'confirmed', 'cancellation_requested'];
const LOCK_AFTER_FAILURES = 5;
const LOCK_MINUTES = 15;

/** Escape LIKE wildcards in user search text. */
const like = (s: string) => `%${s.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

const toStaff = (r: { id: string; name: string; email: string; role: StaffUser['role']; active: boolean; last_active_at: Date | null }): StaffUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  active: r.active,
  ...(r.last_active_at ? { lastActiveAt: r.last_active_at.toISOString() } : {}),
});

export function adminRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db, cfg } = ctx;
  const staff = (req: FastifyRequest, permission?: Parameters<typeof requireStaff>[2]) => requireStaff(db, req, permission);
  const toBooking = (r: BookingRow) => toAdminBooking(r, cfg.demoMode);

  // ---------- Sign-in ----------

  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { email, password } = S.login.parse(req.body);
    const { rows } = await db.query('SELECT * FROM staff_users WHERE lower(email) = $1', [email]);
    const u = rows[0];
    const locked = u?.locked_until && new Date(u.locked_until) > new Date();
    const valid = await verifyPassword(password, u?.password_hash);
    if (!u || !u.active || locked || !valid) {
      if (u && !locked && !valid) {
        await db.query(
          `UPDATE staff_users SET failed_logins = failed_logins + 1,
                  locked_until = CASE WHEN failed_logins + 1 >= $2 THEN now() + $3 * interval '1 minute' ELSE locked_until END
            WHERE id = $1`,
          [u.id, LOCK_AFTER_FAILURES, LOCK_MINUTES],
        );
        if (u.failed_logins + 1 >= LOCK_AFTER_FAILURES) await audit(db, null, 'staff.locked', u.email, 'Too many failed sign-ins');
      }
      // One message for every failure, so it does not reveal which accounts exist.
      throw new AppError('UNAUTHORIZED', 'INVALID_CREDENTIALS');
    }
    await db.query('UPDATE staff_users SET failed_logins = 0, locked_until = NULL, last_active_at = now() WHERE id = $1', [u.id]);
    await createStaffSession(db, cfg, reply, u.id);
    await audit(db, u, 'staff.sign_in', u.email);
    return { user: toStaff(u), mustChangePassword: u.must_change_password };
  });

  app.get('/auth/me', async (req) => {
    const s = await getStaff(db, req);
    if (!s) throw new AppError('UNAUTHORIZED');
    const { rows } = await db.query('SELECT * FROM staff_users WHERE id = $1', [s.id]);
    return { user: toStaff(rows[0]), mustChangePassword: s.mustChangePassword };
  });

  app.post('/auth/logout', async (req, reply) => {
    const s = await getStaff(db, req);
    if (s) await db.query('DELETE FROM staff_sessions WHERE token_hash = $1', [s.sessionHash]);
    reply.clearCookie(STAFF_COOKIE, cookieOptions(cfg, 'staff', 0));
    return { ok: true };
  });

  app.post('/auth/password', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req) => {
    const s = await getStaff(db, req);
    if (!s) throw new AppError('UNAUTHORIZED');
    const { currentPassword, newPassword } = S.changePassword.parse(req.body);
    const { rows } = await db.query('SELECT password_hash FROM staff_users WHERE id = $1', [s.id]);
    if (!(await verifyPassword(currentPassword, rows[0]?.password_hash))) {
      throw new AppError('VALIDATION_ERROR', 'Wrong password', [{ field: 'currentPassword', messageKey: 'admin.account.wrongPassword' }]);
    }
    const problem = passwordProblem(newPassword, s.email);
    if (problem || newPassword === currentPassword) {
      throw new AppError('VALIDATION_ERROR', problem ?? 'Choose a new password', [{ field: 'newPassword', messageKey: 'admin.account.weakPassword' }]);
    }
    await db.query('UPDATE staff_users SET password_hash = $2, must_change_password = false WHERE id = $1', [s.id, await hashPassword(newPassword)]);
    // Other devices are signed out; this one stays signed in.
    await revokeStaffSessions(db, s.id, s.sessionHash);
    await audit(db, s, 'staff.password_changed', s.email);
    return { ok: true };
  });

  // ---------- Overview ----------

  app.get('/dashboard', async (req) => {
    await staff(req);
    const today = todayISO();
    const lastMonthStart = `${monthOf(addDays(`${monthOf(today)}-01`, -1))}-01`;
    const { rows } = await db.query<BookingRow>(
      `SELECT * FROM bookings WHERE event_date >= $1 OR created_at >= $2::date OR status = ANY($3) OR modification_request IS NOT NULL`,
      [dashboardWindowStart(today), lastMonthStart, OPEN],
    );
    return buildDashboard(rows.map(toBooking), today);
  });

  // ---------- Bookings ----------

  app.get('/bookings', async (req): Promise<Paginated<AdminBooking>> => {
    await staff(req);
    const q = S.bookingQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    if (q.status === 'needs_action') {
      where.push(`(b.status IN ('pending_request','pending_confirmation','cancellation_requested') OR (b.modification_request IS NOT NULL AND b.status = ANY(${p(OPEN)})))`);
    } else if (q.status) where.push(`b.status = ${p(q.status)}`);
    if (q.cityId) where.push(`b.city_id = ${p(q.cityId)}`);
    if (q.serviceId) where.push(`b.service_id = ${p(q.serviceId)}`);
    if (q.categoryId) where.push(`s.category_id = ${p(q.categoryId)}`);
    if (q.providerId) where.push(`s.provider_id = ${p(q.providerId)}`);
    if (q.customerId) where.push(`b.customer_id = ${p(q.customerId)}`);
    if (q.from) where.push(`b.event_date >= ${p(q.from)}`);
    if (q.to) where.push(`b.event_date <= ${p(q.to)}`);
    if (q.q) {
      const t = p(like(q.q));
      const digits = q.q.replace(/\D/g, '');
      where.push(
        `(b.reference ILIKE ${t} OR b.customer->>'fullName' ILIKE ${t} OR b.customer->>'phone' ILIKE ${t} OR b.customer->>'email' ILIKE ${t}
          OR b.event->>'venue' ILIKE ${t} OR s.data->'name'->>'ar' ILIKE ${t} OR s.data->'name'->>'en' ILIKE ${t}
          ${digits.length >= 4 ? `OR regexp_replace(b.customer->>'phone', '\\D', '', 'g') LIKE ${p(like(digits))}` : ''})`,
      );
    }
    const order = {
      'event-asc': 'b.event_date ASC, b.start_time ASC',
      'event-desc': 'b.event_date DESC, b.start_time DESC',
      'total-desc': 'b.total DESC',
      'created-desc': 'b.created_at DESC',
    }[q.sort ?? 'created-desc'];
    const { rows } = await db.query<BookingRow & { total_count: number }>(
      `SELECT b.*, count(*) OVER () AS total_count FROM bookings b JOIN services s ON s.id = b.service_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order}, b.id LIMIT ${p(q.pageSize)} OFFSET ${p((q.page - 1) * q.pageSize)}`,
      params,
    );
    let total = rows[0]?.total_count ?? 0;
    if (!rows.length && q.page > 1) {
      total = (await db.query(`SELECT count(*)::int AS n FROM bookings b JOIN services s ON s.id = b.service_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, params.slice(0, -2))).rows[0].n;
    }
    return { items: rows.map(toBooking), total };
  });

  async function bookingRow(c: Queryable, idOrRef: string, lock = false) {
    const { rows } = await c.query<BookingRow>(`SELECT * FROM bookings WHERE id = $1 OR reference = $1 ${lock ? 'FOR UPDATE' : ''}`, [idOrRef]);
    if (!rows[0]) throw notFound('Booking not found');
    return rows[0];
  }

  app.get<{ Params: { id: string } }>('/bookings/:id', async (req) => {
    await staff(req);
    return toBooking(await bookingRow(db, req.params.id));
  });

  app.post<{ Params: { id: string } }>('/bookings/:id/transitions', async (req) => {
    const s = await staff(req, 'bookings.manage');
    const { action, note } = S.transition.parse(req.body);
    const def = ACTIONS[action];
    if (['reject', 'approve_cancellation', 'decline_cancellation'].includes(action) && !note) {
      throw new AppError('VALIDATION_ERROR', 'Note required', [{ field: 'note', messageKey: 'validation.required' }]);
    }
    return tx(db, async (c) => {
      const row = await bookingRow(c, req.params.id, true);
      if (!def.from.includes(row.status)) throw new AppError('TRANSITION_NOT_ALLOWED');
      if (action === 'complete' && row.event.date > todayISO()) throw new AppError('TRANSITION_NOT_ALLOWED', 'Event has not happened yet');
      const at = new Date().toISOString();
      const entries = [];
      // Confirming a brand-new request records the review step too, so the history stays complete.
      if (action === 'confirm' && row.status === 'pending_request') entries.push({ at, status: 'pending_confirmation', noteKey: 'history.staffReviewing' });
      entries.push({ at, status: def.to, noteKey: def.noteKey, ...(note ? { note } : {}) });
      const pricing = def.to === 'confirmed' ? { ...row.pricing, isEstimate: false } : row.pricing;
      const { rows } = await c.query<BookingRow>(
        `UPDATE bookings SET status = $2, history = history || $3::jsonb, pricing = $4, updated_at = now(),
                modification_request = CASE WHEN $2 IN ('cancelled', 'completed') THEN NULL ELSE modification_request END
          WHERE id = $1 RETURNING *`,
        [row.id, def.to, JSON.stringify(entries), pricing],
      );
      await audit(c, s, `booking.${action}`, row.reference, note);
      return toBooking(rows[0]);
    });
  });

  app.post<{ Params: { id: string } }>('/bookings/:id/modification-request/resolve', async (req) => {
    const s = await staff(req, 'bookings.manage');
    const { note } = S.optionalNote.parse(req.body ?? {});
    return tx(db, async (c) => {
      const row = await bookingRow(c, req.params.id, true);
      if (!row.modification_request) throw new AppError('CONFLICT', 'No open change request');
      const entry = { at: new Date().toISOString(), status: row.status, noteKey: 'history.staffModificationHandled', ...(note ? { note } : {}) };
      const { rows } = await c.query<BookingRow>(
        `UPDATE bookings SET modification_request = NULL, history = history || $2::jsonb, updated_at = now() WHERE id = $1 RETURNING *`,
        [row.id, JSON.stringify([entry])],
      );
      await audit(c, s, 'booking.modification_handled', row.reference, note);
      return toBooking(rows[0]);
    });
  });

  app.post<{ Params: { id: string } }>('/bookings/:id/notes', async (req) => {
    const s = await staff(req, 'bookings.manage');
    const { text } = S.internalNote.parse(req.body);
    return tx(db, async (c) => {
      const row = await bookingRow(c, req.params.id, true);
      const { rows } = await c.query<BookingRow>(`UPDATE bookings SET internal_notes = internal_notes || $2::jsonb WHERE id = $1 RETURNING *`, [
        row.id,
        JSON.stringify([{ at: new Date().toISOString(), by: s.name, text }]),
      ]);
      await audit(c, s, 'booking.note', row.reference);
      return toBooking(rows[0]);
    });
  });

  // ---------- Catalogue ----------

  app.get('/services', async (req) => {
    await staff(req);
    return loadServices(db, false);
  });

  app.get<{ Params: { id: string } }>('/services/:id', async (req) => {
    await staff(req);
    const s = (await loadServices(db, false)).find((x) => x.id === req.params.id || x.slug === req.params.id);
    if (!s) throw notFound();
    return s;
  });

  app.patch<{ Params: { id: string } }>('/services/:id', async (req) => {
    const s = await staff(req, 'catalog.manage');
    const patch = S.servicePatch.parse(req.body);
    return tx(db, async (c) => {
      const current = (await loadServices(c, false)).find((x) => x.id === req.params.id);
      if (!current) throw notFound();
      // Server-owned fields are dropped from the patch.
      const { id: _i, startingPrice: _sp, durationMinutes: _d, rating: _r, reviewCount: _rc, reviews: _rv, bookingsCount: _b, updatedAt: _u, active, categoryId, providerId, slug, ...rest } =
        patch;
      void [_i, _sp, _d, _r, _rc, _rv, _b, _u];
      const next = { ...current, ...rest };
      const errors = [];
      if (categoryId && !(await c.query('SELECT 1 FROM categories WHERE id = $1', [categoryId])).rowCount) errors.push({ field: 'categoryId', messageKey: 'validation.required' });
      if (providerId && !(await c.query('SELECT 1 FROM providers WHERE id = $1', [providerId])).rowCount) errors.push({ field: 'providerId', messageKey: 'validation.required' });
      const cityIds = new Set((await c.query('SELECT id FROM cities')).rows.map((r) => r.id));
      if (next.cityIds.some((x) => !cityIds.has(x))) errors.push({ field: 'cityIds', messageKey: 'validation.required' });
      const typeIds = new Set((await c.query('SELECT id FROM event_types')).rows.map((r) => r.id));
      if (next.eventTypeIds.some((x) => !typeIds.has(x))) errors.push({ field: 'eventTypeIds', messageKey: 'validation.required' });
      if (new Set(next.packages.map((x) => x.id)).size !== next.packages.length) errors.push({ field: 'packages', messageKey: 'validation.required' });
      if (errors.length) throw new AppError('VALIDATION_ERROR', 'Invalid service', errors);
      next.startingPrice = Math.min(...next.packages.map((x) => x.price));
      next.durationMinutes = Math.min(...next.packages.map((x) => x.durationMinutes));
      const { id: _id, providerId: _pid, active: _act, updatedAt: _upd, categoryId: _cid, slug: _slug, ...data } = next;
      void [_id, _pid, _act, _upd, _cid, _slug];
      try {
        await c.query(
          `UPDATE services SET data = $2, slug = $3, category_id = $4, provider_id = $5, active = $6, updated_at = now() WHERE id = $1`,
          [current.id, data, slug ?? current.slug, categoryId ?? current.categoryId, providerId ?? current.providerId, active ?? current.active],
        );
      } catch (e) {
        if ((e as { code?: string }).code === '23505') throw new AppError('CONFLICT', 'Slug already used', [{ field: 'slug', messageKey: 'validation.required' }]);
        throw e;
      }
      await audit(c, s, 'service.update', next.name.en);
      return (await loadServices(c, false)).find((x) => x.id === current.id)!;
    });
  });

  app.get('/categories', async (req) => {
    await staff(req);
    return listCategories(db, false);
  });

  app.put<{ Params: { id: string } }>('/categories/:id', async (req) => {
    const s = await staff(req, 'catalog.manage');
    const cat = S.category.parse(req.body);
    if (cat.id !== req.params.id) throw new AppError('VALIDATION_ERROR', 'Id mismatch');
    const { id, slug, sortOrder, active, ...data } = cat;
    try {
      await db.query(
        `INSERT INTO categories (id, slug, sort_order, active, data) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET slug = $2, sort_order = $3, active = $4, data = $5`,
        [id, slug, sortOrder, active, data],
      );
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw new AppError('CONFLICT', 'Slug already used');
      throw e;
    }
    await audit(db, s, 'category.save', cat.name.en);
    return cat;
  });

  app.get('/providers', async (req): Promise<ProviderWithStats[]> => {
    await staff(req);
    const [{ rows }, services, stats] = await Promise.all([
      db.query('SELECT * FROM providers ORDER BY id'),
      loadServices(db, false),
      db.query<{ service_id: string; n: number; revenue: number }>(
        `SELECT service_id, count(*)::int AS n, COALESCE(sum(total) FILTER (WHERE status = ANY($1)), 0) AS revenue FROM bookings GROUP BY service_id`,
        [REVENUE],
      ),
    ]);
    const byService = new Map(stats.rows.map((r) => [r.service_id, r]));
    return rows.map((r) => {
      const p = toProvider(r);
      const svcs = services.filter((x) => x.providerId === p.id);
      const rated = svcs.filter((x) => x.reviewCount > 0);
      return {
        ...p,
        serviceCount: svcs.length,
        bookingCount: svcs.reduce((n, x) => n + (byService.get(x.id)?.n ?? 0), 0),
        revenue: round2(svcs.reduce((n, x) => n + (byService.get(x.id)?.revenue ?? 0), 0)),
        rating: rated.length ? Math.round((rated.reduce((n, x) => n + x.rating, 0) / rated.length) * 10) / 10 : 0,
      };
    });
  });

  app.put<{ Params: { id: string } }>('/providers/:id', async (req) => {
    const s = await staff(req, 'providers.manage');
    const parsed = S.provider.parse(req.body);
    if (parsed.id !== req.params.id) throw new AppError('VALIDATION_ERROR', 'Id mismatch');
    const { id, status, commissionRate, serviceCount: _a, bookingCount: _b, revenue: _c, rating: _d, ...data } = parsed;
    void [_a, _b, _c, _d];
    await db.query(
      `INSERT INTO providers (id, status, commission_rate, data) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET status = $2, commission_rate = $3, data = $4, updated_at = now()`,
      [id, status, commissionRate, data],
    );
    await audit(db, s, 'provider.save', parsed.name.en, status);
    return toProvider((await db.query('SELECT * FROM providers WHERE id = $1', [id])).rows[0]);
  });

  // ---------- Customers ----------

  const CUSTOMER_SELECT = `
    SELECT c.*, count(b.id)::int AS booking_count,
           COALESCE(sum(b.total) FILTER (WHERE b.status = ANY($1)), 0) AS total_spent,
           max(b.created_at) AS last_booking_at, count(*) OVER () AS total_count
      FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id`;
  const toCustomer = (r: Record<string, unknown>): CustomerWithStats => ({
    id: r.id as string,
    fullName: r.full_name as string,
    phone: r.phone as string,
    email: r.email as string,
    cityId: (r.city_id as string) ?? '',
    createdAt: (r.created_at as Date).toISOString(),
    tags: r.tags as string[],
    ...(r.notes ? { notes: r.notes as string } : {}),
    blocked: r.blocked as boolean,
    bookingCount: r.booking_count as number,
    totalSpent: round2(r.total_spent as number),
    ...(r.last_booking_at ? { lastBookingAt: (r.last_booking_at as Date).toISOString() } : {}),
    fromWebsite: r.source === 'website',
  });

  app.get('/customers', async (req): Promise<Paginated<CustomerWithStats>> => {
    await staff(req);
    const q = S.customerQuery.parse(req.query);
    const params: unknown[] = [REVENUE];
    const where: string[] = [];
    if (q.tag === 'website') where.push(`c.source = 'website'`);
    else if (q.tag) {
      params.push(q.tag);
      where.push(`$${params.length} = ANY(c.tags)`);
    }
    if (q.q) {
      params.push(like(q.q));
      where.push(`(c.full_name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(q.pageSize, (q.page - 1) * q.pageSize);
    const { rows } = await db.query(
      `${CUSTOMER_SELECT} ${w} GROUP BY c.id
        ORDER BY last_booking_at DESC NULLS LAST, c.created_at DESC, c.id LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const total = rows.length ? Number(rows[0].total_count) : 0;
    return { items: rows.map(toCustomer), total };
  });

  async function customer(c: Queryable, id: string) {
    const { rows } = await c.query(`${CUSTOMER_SELECT} WHERE c.id = $2 GROUP BY c.id`, [REVENUE, id]);
    if (!rows[0]) throw notFound();
    return toCustomer(rows[0]);
  }

  app.get<{ Params: { id: string } }>('/customers/:id', async (req) => {
    await staff(req);
    return customer(db, req.params.id);
  });

  app.patch<{ Params: { id: string } }>('/customers/:id', async (req) => {
    const s = await staff(req, 'customers.manage');
    const patch = S.customerPatch.parse(req.body);
    const current = await customer(db, req.params.id);
    await db.query('UPDATE customers SET tags = $2, notes = $3, blocked = $4 WHERE id = $1', [
      current.id,
      patch.tags ?? current.tags,
      patch.notes ?? current.notes ?? null,
      patch.blocked ?? current.blocked,
    ]);
    await audit(db, s, patch.blocked !== undefined && patch.blocked !== current.blocked ? (patch.blocked ? 'customer.block' : 'customer.unblock') : 'customer.update', current.fullName);
    return customer(db, current.id);
  });

  // ---------- Pricing, promotions, reports ----------

  app.get('/pricing', async (req) => {
    await staff(req);
    return getSettings(db);
  });

  app.put('/pricing', async (req) => {
    const s = await staff(req, 'pricing.manage');
    const settings = S.pricingSettings.parse(req.body);
    const cities = new Set((await db.query('SELECT id FROM cities')).rows.map((r) => r.id));
    if (Object.keys(settings.travelFees).some((k) => !cities.has(k))) throw new AppError('VALIDATION_ERROR', 'Unknown city', [{ field: 'travelFees', messageKey: 'validation.required' }]);
    await db.query('UPDATE settings SET data = $1, updated_at = now() WHERE id = 1', [settings]);
    await audit(db, s, 'pricing.update', `VAT ${round2(settings.vat.rate * 100)}%`);
    return settings;
  });

  app.get('/promotions', async (req) => {
    await staff(req);
    return (await db.query('SELECT * FROM promotions ORDER BY (data->>\'startsOn\') DESC, id')).rows.map(toPromotion);
  });

  app.put<{ Params: { id: string } }>('/promotions/:id', async (req) => {
    const s = await staff(req, 'promotions.manage');
    const promo = S.promotion.parse(req.body);
    if (promo.id !== req.params.id) throw new AppError('VALIDATION_ERROR', 'Id mismatch');
    const existing = (await db.query('SELECT data FROM promotions WHERE id = $1', [promo.id])).rows[0];
    const { id, code, active, uses: _u, ...data } = promo;
    void _u;
    try {
      await db.query(
        `INSERT INTO promotions (id, code, active, data) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET code = $2, active = $3, data = $4`,
        [id, code, active, { ...data, uses: existing?.data.uses ?? 0 }],
      );
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw new AppError('CONFLICT', 'Code already exists', [{ field: 'code', messageKey: 'admin.promotions.codeTaken' }]);
      throw e;
    }
    await audit(db, s, existing ? 'promotion.save' : 'promotion.create', code);
    return toPromotion((await db.query('SELECT * FROM promotions WHERE id = $1', [id])).rows[0]);
  });

  app.delete<{ Params: { id: string } }>('/promotions/:id', async (req, reply) => {
    const s = await staff(req, 'promotions.manage');
    const { rows } = await db.query('DELETE FROM promotions WHERE id = $1 RETURNING code', [req.params.id]);
    if (rows[0]) await audit(db, s, 'promotion.delete', rows[0].code);
    reply.code(204);
  });

  app.get('/reports/summary', async (req) => {
    await staff(req);
    const { from, to } = S.reportQuery.parse(req.query);
    const [{ rows }, services, providers, settings] = await Promise.all([
      db.query<BookingRow>('SELECT * FROM bookings WHERE event_date BETWEEN $1 AND $2', [from, to]),
      loadServices(db, false),
      db.query('SELECT id, commission_rate FROM providers'),
      getSettings(db),
    ]);
    return buildReport(
      rows.map(toBooking),
      {
        services: new Map(services.map((x) => [x.id, { categoryId: x.categoryId, providerId: x.providerId }])),
        commissionRates: new Map(providers.rows.map((r) => [r.id, r.commission_rate])),
        defaultCommissionRate: settings.defaultCommissionRate,
      },
      from,
      to,
    );
  });

  // ---------- Staff & audit ----------

  app.get('/staff', async (req) => {
    await staff(req);
    return (await db.query('SELECT * FROM staff_users ORDER BY created_at, id')).rows.map(toStaff);
  });

  app.put<{ Params: { id: string } }>('/staff/:id', async (req) => {
    const me = await staff(req, 'staff.manage');
    const input = S.staffUser.parse(req.body);
    if (input.id !== req.params.id) throw new AppError('VALIDATION_ERROR', 'Id mismatch');
    return tx(db, async (c) => {
      await c.query('LOCK TABLE staff_users IN SHARE ROW EXCLUSIVE MODE');
      const existing = (await c.query('SELECT * FROM staff_users WHERE id = $1', [input.id])).rows[0];
      if (existing && existing.id === me.id && (input.role !== existing.role || !input.active)) {
        throw new AppError('FORBIDDEN', 'You cannot change your own role or disable yourself');
      }
      let tempPassword: string | undefined;
      try {
        if (existing) {
          await c.query('UPDATE staff_users SET name = $2, email = $3, role = $4, active = $5 WHERE id = $1', [input.id, input.name, input.email, input.role, input.active]);
        } else {
          tempPassword = temporaryPassword();
          await c.query(
            `INSERT INTO staff_users (id, name, email, role, active, password_hash, must_change_password) VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [input.id, input.name, input.email, input.role, input.active, await hashPassword(tempPassword)],
          );
        }
      } catch (e) {
        if ((e as { code?: string }).code === '23505') throw new AppError('CONFLICT', 'E-mail already used', [{ field: 'email', messageKey: 'admin.staff.emailTaken' }]);
        throw e;
      }
      const admins = (await c.query(`SELECT count(*)::int AS n FROM staff_users WHERE role = 'admin' AND active`)).rows[0].n;
      if (admins === 0) throw new AppError('CONFLICT', 'At least one active administrator is required');
      if (existing && (!input.active || input.role !== existing.role)) await revokeStaffSessions(c, input.id);
      await audit(c, me, existing ? 'staff.save' : 'staff.create', input.email, input.role + (input.active ? '' : ' (disabled)'));
      const saved = toStaff((await c.query('SELECT * FROM staff_users WHERE id = $1', [input.id])).rows[0]);
      return tempPassword ? { ...saved, temporaryPassword: tempPassword } : saved;
    });
  });

  app.post<{ Params: { id: string } }>('/staff/:id/reset-password', async (req) => {
    const me = await staff(req, 'staff.manage');
    if (req.params.id === me.id) throw new AppError('FORBIDDEN', 'Use “Change password” for your own account');
    const temp = temporaryPassword();
    const { rows } = await db.query(
      `UPDATE staff_users SET password_hash = $2, must_change_password = true, failed_logins = 0, locked_until = NULL WHERE id = $1 RETURNING email`,
      [req.params.id, await hashPassword(temp)],
    );
    if (!rows[0]) throw notFound();
    await revokeStaffSessions(db, req.params.id);
    await audit(db, me, 'staff.password_reset', rows[0].email);
    return { temporaryPassword: temp };
  });

  app.get('/audit-log', async (req) => {
    await staff(req);
    const { limit } = S.limitQuery.parse(req.query);
    const { rows } = await db.query('SELECT * FROM audit_log ORDER BY at DESC, id DESC LIMIT $1', [limit]);
    return rows.map((r) => ({ id: String(r.id), at: r.at.toISOString(), by: r.actor_name, action: r.action, target: r.target, ...(r.detail ? { detail: r.detail } : {}) }));
  });

}
