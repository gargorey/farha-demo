import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Booking, BookingStatus } from '@/models';
import { cancellationActionFor, canTransition, modificationAvailability } from '@/utils/booking-lifecycle';
import { filterAndSortServices } from '@/utils/catalog-search';
import { calculatePricing } from '@/utils/pricing';
import type { AppContext } from '../app';
import { tx } from '../db/pool';
import { availabilityRange, busySlots, inBookingWindow, overlaps, startMinutes } from '../domain/availability';
import {
  customerBooking,
  findService,
  getSettings,
  listCategories,
  listCities,
  listEventTypes,
  loadServices,
  publicCategory,
  publicService,
  toAdminBooking,
  type BookingRow,
} from '../domain/repo';
import { ensureCustomerSession, getCustomerSession, OWNED_BY_SESSION, CUSTOMER_COOKIE, cookieOptions } from '../lib/auth';
import { AppError, notFound } from '../lib/errors';
import * as S from '../lib/schemas';
import { bookingReference, hmac, safeEqualHex, sha256, sixDigitCode } from '../lib/security';

const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PER_PHONE_PER_15_MIN = 3;

export function publicRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db, cfg } = ctx;
  const toCustomer = (r: BookingRow): Booking => customerBooking(toAdminBooking(r, cfg.demoMode));

  app.get('/health', async () => {
    await db.query('SELECT 1');
    return { ok: true };
  });

  // ---------- Catalogue ----------

  /** Business rules the website needs to show correct estimates and date limits. */
  app.get('/settings', async () => {
    const s = await getSettings(db);
    return {
      vat: s.vat,
      applyTravelFee: s.applyTravelFee,
      minLeadDays: s.minLeadDays,
      maxAdvanceDays: s.maxAdvanceDays,
      cancellationCutoffHours: s.cancellationCutoffHours,
      modificationCutoffHours: s.modificationCutoffHours,
      freeWithdrawalBeforeConfirmation: s.freeWithdrawalBeforeConfirmation,
      demo: cfg.demoMode,
    };
  });

  app.get('/services', async (req) => {
    const query = S.serviceQuery.parse(req.query);
    const [services, categories] = await Promise.all([loadServices(db, true), listCategories(db, true)]);
    const names = Object.fromEntries(categories.map((c) => [c.id, [c.name.ar, c.name.en]]));
    const items = filterAndSortServices(services.map(publicService), query, names);
    return { items, total: items.length };
  });

  app.get<{ Params: { idOrSlug: string } }>('/services/:idOrSlug', async (req) => publicService(await findService(db, req.params.idOrSlug, true)));

  app.get<{ Params: { id: string } }>('/services/:id/availability', async (req) => {
    const { from, to } = S.availabilityQuery.parse(req.query);
    const [service, settings] = await Promise.all([findService(db, req.params.id, true), getSettings(db)]);
    return availabilityRange(db, service, settings, from, to);
  });

  app.get('/categories', async () => (await listCategories(db, true)).map(publicCategory));
  app.get('/event-types', async () => listEventTypes(db));
  app.get('/cities', async () => listCities(db, await getSettings(db)));

  // ---------- Bookings ----------

  app.post('/bookings', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req, reply) => {
    const key = z.string().min(8).max(100).regex(/^[A-Za-z0-9-]+$/).safeParse(req.headers['idempotency-key']);
    if (!key.success) throw new AppError('VALIDATION_ERROR', 'Idempotency-Key header required', [{ field: 'idempotencyKey', messageKey: 'validation.required' }]);
    const body = S.createBooking.parse(req.body);
    const fingerprint = sha256([body.customer.phone, body.selection.serviceId, body.event.date, body.event.startTime].join('|'));

    const result = await tx(db, async (c) => {
      // Same key at the same time: the second request waits, then sees the first booking.
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`idem:${key.data}`]);
      const seen = await c.query<{ fingerprint: string; booking_id: string }>('SELECT fingerprint, booking_id FROM idempotency_keys WHERE key = $1', [key.data]);
      if (seen.rows[0]) {
        if (!safeEqualHex(seen.rows[0].fingerprint, fingerprint)) throw new AppError('CONFLICT', 'Idempotency-Key reused for a different booking');
        const { rows } = await c.query<BookingRow>('SELECT * FROM bookings WHERE id = $1', [seen.rows[0].booking_id]);
        return { row: rows[0], created: false };
      }

      const settings = await getSettings(c);
      const service = await findService(c, body.selection.serviceId, true).catch(() => {
        throw new AppError('VALIDATION_ERROR', 'Unknown service', [{ field: 'serviceId', messageKey: 'validation.required' }]);
      });
      const pkg = service.packages.find((p) => p.id === body.selection.packageId);
      const fieldErrors = [];
      if (!pkg) fieldErrors.push({ field: 'packageId', messageKey: 'validation.required' });
      for (const a of body.selection.addOns) {
        const def = service.addOns.find((x) => x.id === a.addOnId);
        if (!def || a.quantity > (def.quantifiable ? def.maxQuantity : 1)) fieldErrors.push({ field: 'addOns', messageKey: 'validation.required' });
      }
      const cities = await listCities(c, settings);
      const city = cities.find((x) => x.id === body.event.cityId);
      if (!city || !service.cityIds.includes(city.id)) fieldErrors.push({ field: 'cityId', messageKey: 'validation.cityNotServed' });
      if (!service.eventTypeIds.includes(body.event.eventTypeId)) fieldErrors.push({ field: 'eventTypeId', messageKey: 'validation.eventTypeNotSupported' });
      if (body.event.extraHours > service.maxExtraHours || (body.event.extraHours > 0 && !service.extraHourPrice)) {
        fieldErrors.push({ field: 'extraHours', messageKey: 'validation.required' });
      }
      if (fieldErrors.length || !pkg || !city) throw new AppError('VALIDATION_ERROR', 'Invalid booking', fieldErrors);
      if (!inBookingWindow(body.event.date, settings)) throw new AppError('DATE_UNAVAILABLE', 'Date outside the booking window');

      // Customer record: matched by phone. A booking never changes an existing customer's details.
      let customer = (await c.query<{ id: string; blocked: boolean }>('SELECT id, blocked FROM customers WHERE phone = $1', [body.customer.phone])).rows[0];
      if (customer?.blocked) throw new AppError('FORBIDDEN', 'Please contact us to book');
      if (!customer) {
        customer = (
          await c.query(
            `INSERT INTO customers (id, full_name, phone, email, city_id, source) VALUES ($1, $2, $3, $4, $5, 'website')
             ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone RETURNING id, blocked`,
            [`cus-${crypto.randomUUID()}`, body.customer.fullName, body.customer.phone, body.customer.email, body.event.cityId],
          )
        ).rows[0];
      }

      // One booking at a time per service and day, so two people cannot take the same slot.
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`slot:${service.id}:${body.event.date}`]);
      const duration = pkg.durationMinutes + body.event.extraHours * 60;
      const busy = await busySlots(c, service.id, body.event.date, body.event.date);
      if (overlaps(startMinutes(body.event.startTime), duration, busy, body.event.date)) throw new AppError('DATE_UNAVAILABLE', 'Time already booked');

      const pricing = calculatePricing(
        { service, packageId: pkg.id, addOns: body.selection.addOns, extraHours: body.event.extraHours, city },
        { vat: settings.vat, applyTravelFee: settings.applyTravelFee, discounts: [] },
      );
      const now = new Date().toISOString();
      const history = [{ at: now, status: 'pending_request' as BookingStatus, noteKey: 'history.submitted' }];
      let row: BookingRow | undefined;
      for (let attempt = 0; !row && attempt < 5; attempt++) {
        const ins = await c.query<BookingRow>(
          `INSERT INTO bookings (id, reference, status, customer_id, service_id, event_date, start_time, duration_minutes, city_id,
                                 channel, origin, total, selection, event, customer, pricing, history)
           VALUES ($1, $2, 'pending_request', $3, $4, $5, $6, $7, $8, 'website', 'website', $9, $10, $11, $12, $13, $14)
           ON CONFLICT (reference) DO NOTHING RETURNING *`,
          [
            crypto.randomUUID(),
            bookingReference(),
            customer.id,
            service.id,
            body.event.date,
            body.event.startTime,
            duration,
            city.id,
            pricing.total,
            body.selection,
            body.event,
            body.customer,
            pricing,
            JSON.stringify(history),
          ],
        );
        row = ins.rows[0];
      }
      if (!row) throw new Error('Could not allocate a booking reference');
      await c.query('INSERT INTO idempotency_keys (key, fingerprint, booking_id) VALUES ($1, $2, $3)', [key.data, fingerprint, row.id]);
      return { row, created: true };
    });

    // Remember the booking in this browser's session so the customer can open it without signing in.
    const session = await ensureCustomerSession(db, cfg, req, reply);
    await db.query('UPDATE customer_sessions SET booking_ids = array_append(booking_ids, $2) WHERE token_hash = $1 AND NOT ($2 = ANY(booking_ids))', [
      session.hash,
      result.row.id,
    ]);
    reply.code(result.created ? 201 : 200);
    return toCustomer(result.row);
  });

  async function ownedBooking(req: Parameters<typeof getCustomerSession>[1], idOrRef: string, lock = false, c = db as Parameters<typeof getCustomerSession>[0]) {
    const session = await getCustomerSession(c, req);
    if (!session) throw notFound('Booking not found');
    const { rows } = await c.query<BookingRow>(
      `SELECT b.* FROM bookings b WHERE (b.id = $3 OR b.reference = $3) AND ${OWNED_BY_SESSION} ${lock ? 'FOR UPDATE' : ''}`,
      [session.bookingIds, session.verifiedPhone, idOrRef],
    );
    // Not found and not yours look the same, so booking ids cannot be probed.
    if (!rows[0]) throw notFound('Booking not found');
    return rows[0];
  }

  app.get('/bookings', async (req) => {
    const session = await getCustomerSession(db, req);
    if (!session) return { items: [] };
    const { rows } = await db.query<BookingRow>(`SELECT b.* FROM bookings b WHERE ${OWNED_BY_SESSION} ORDER BY b.created_at DESC LIMIT 200`, [
      session.bookingIds,
      session.verifiedPhone,
    ]);
    return { items: rows.map(toCustomer) };
  });

  app.get<{ Params: { id: string } }>('/bookings/:id', async (req) => toCustomer(await ownedBooking(req, req.params.id)));

  app.patch<{ Params: { id: string } }>('/bookings/:id', async (req) => {
    const { modificationRequest } = S.modificationRequest.parse(req.body);
    return tx(db, async (c) => {
      const row = await ownedBooking(req, req.params.id, true, c);
      const booking = toAdminBooking(row, cfg.demoMode);
      const allowed = modificationAvailability(booking, new Date(), await getSettings(c));
      if (!allowed.allowed) throw new AppError(allowed.reason === 'window' ? 'POLICY_WINDOW_CLOSED' : 'TRANSITION_NOT_ALLOWED', allowed.reason);
      const at = new Date().toISOString();
      const entry = { at, status: row.status, noteKey: 'history.modificationRequested', note: modificationRequest.message };
      const { rows } = await c.query<BookingRow>(
        `UPDATE bookings SET modification_request = $2, history = history || $3::jsonb, updated_at = now() WHERE id = $1 RETURNING *`,
        [row.id, { message: modificationRequest.message, requestedAt: at }, JSON.stringify([entry])],
      );
      return toCustomer(rows[0]);
    });
  });

  app.post<{ Params: { id: string } }>('/bookings/:id/cancellation-requests', async (req) => {
    const { reason } = S.cancellationRequest.parse(req.body ?? {});
    return tx(db, async (c) => {
      const row = await ownedBooking(req, req.params.id, true, c);
      const action = cancellationActionFor(toAdminBooking(row, cfg.demoMode), new Date(), await getSettings(c));
      if (action.kind === 'blocked') throw new AppError(action.reason === 'window' ? 'POLICY_WINDOW_CLOSED' : 'TRANSITION_NOT_ALLOWED', action.reason);
      const [to, noteKey] = action.kind === 'withdraw' ? (['cancelled', 'history.withdrawn'] as const) : (['cancellation_requested', 'history.cancellationRequested'] as const);
      if (!canTransition(row.status, to)) throw new AppError('TRANSITION_NOT_ALLOWED');
      const entry = { at: new Date().toISOString(), status: to, noteKey, ...(reason ? { note: reason } : {}) };
      const { rows } = await c.query<BookingRow>(
        `UPDATE bookings SET status = $2, history = history || $3::jsonb,
                modification_request = CASE WHEN $2 = 'cancelled' THEN NULL ELSE modification_request END, updated_at = now()
          WHERE id = $1 RETURNING *`,
        [row.id, to, JSON.stringify([entry])],
      );
      return toCustomer(rows[0]);
    });
  });

  // ---------- Contact ----------

  app.post('/contact-messages', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const m = S.contactMessage.parse(req.body);
    const id = `MSG-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    await db.query('INSERT INTO contact_messages (id, name, email, phone, subject, message) VALUES ($1, $2, $3, $4, $5, $6)', [
      id,
      m.name,
      m.email,
      m.phone || null,
      m.subject,
      m.message,
    ]);
    reply.code(201);
    return { id };
  });

  // ---------- Customer sign-in (phone + one-time code) ----------

  app.post('/auth/otp/request', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (req) => {
    const { phone } = S.otpRequest.parse(req.body);
    const recent = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM otp_challenges WHERE phone = $1 AND created_at > now() - interval '15 minutes'`, [phone]);
    if (recent.rows[0].n >= OTP_PER_PHONE_PER_15_MIN) throw new AppError('RATE_LIMITED', 'Too many codes requested');
    const code = sixDigitCode();
    await db.query(`INSERT INTO otp_challenges (phone, code_hash, expires_at) VALUES ($1, $2, now() + $3 * interval '1 millisecond')`, [
      phone,
      hmac(cfg.secret, `${phone}:${code}`),
      OTP_TTL_MS,
    ]);
    await ctx.sms.send(phone, `Farha code: ${code}`);
    // The same answer whether or not the number has bookings, so numbers cannot be checked.
    return { sent: true, ...(cfg.demoMode ? { demoCode: code } : {}) };
  });

  app.post('/auth/otp/verify', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { phone, code } = S.otpVerify.parse(req.body);
    const ok = await tx(db, async (c) => {
      const { rows } = await c.query(
        `SELECT id, code_hash, attempts FROM otp_challenges
          WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [phone],
      );
      const ch = rows[0];
      if (!ch || ch.attempts >= OTP_MAX_ATTEMPTS) return false;
      if (!safeEqualHex(ch.code_hash, hmac(cfg.secret, `${phone}:${code}`))) {
        await c.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1', [ch.id]);
        return false;
      }
      await c.query('UPDATE otp_challenges SET consumed_at = now() WHERE id = $1', [ch.id]);
      return true;
    });
    if (!ok) throw new AppError('VALIDATION_ERROR', 'Wrong or expired code', [{ field: 'code', messageKey: 'auth.codeInvalid' }]);
    const session = await ensureCustomerSession(db, cfg, req, reply);
    await db.query('UPDATE customer_sessions SET verified_phone = $2 WHERE token_hash = $1', [session.hash, phone]);
    return { verified: true, phone };
  });

  app.get('/auth/session', async (req) => {
    const s = await getCustomerSession(db, req);
    return { verified: !!s?.verifiedPhone, phone: s?.verifiedPhone ?? undefined };
  });

  app.post('/auth/logout', async (req, reply) => {
    const s = await getCustomerSession(db, req);
    if (s) await db.query('DELETE FROM customer_sessions WHERE token_hash = $1', [s.hash]);
    reply.clearCookie(CUSTOMER_COOKIE, cookieOptions(cfg, 'customer', 0));
    return { ok: true };
  });

}
