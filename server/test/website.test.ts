import { addDays, todayISO } from '@/utils/dates';
import { bookingRequest, browser, setup, staffBrowser, type TestEnv } from './helpers';

let env: TestEnv;
beforeAll(async () => {
  env = await setup({ DEMO_MODE: 'true' });
});
afterAll(async () => {
  await env.app.close();
  await env.db.end();
});

describe('catalogue', () => {
  it('lists, filters and opens services without internal fields', async () => {
    const b = browser(env.app);
    const list = await b.get('/services?categoryIds=cat-clowns&cityId=riyadh&sort=price-asc');
    expect(list.status).toBe(200);
    expect(list.body.total).toBeGreaterThan(0);
    expect(list.body.items.every((s: { categoryId: string }) => s.categoryId === 'cat-clowns')).toBe(true);
    const one = await b.get('/services/bobo-the-clown');
    expect(one.status).toBe(200);
    expect(one.body.id).toBe('svc-clown-bobo');
    expect(one.body).not.toHaveProperty('providerId');
    expect(one.body).not.toHaveProperty('active');
    expect((await b.get('/services/nope')).status).toBe(404);
  });

  it('rejects bad query values', async () => {
    const res = await browser(env.app).get('/services?sort=drop-table');
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('serves reference data and public settings', async () => {
    const b = browser(env.app);
    expect((await b.get('/categories')).body.length).toBe(10);
    expect((await b.get('/event-types')).body.length).toBeGreaterThan(5);
    const cities = (await b.get('/cities')).body;
    expect(cities.find((c: { id: string }) => c.id === 'abha').travelFee).toBe(250);
    const settings = (await b.get('/settings')).body;
    expect(settings.vat.rate).toBe(0.15);
    expect(settings).not.toHaveProperty('defaultCommissionRate');
  });

  it('hides services an admin switches off', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    expect((await admin.patch('/admin/services/svc-clown-bobo', { active: false })).status).toBe(200);
    expect((await browser(env.app).get('/services/svc-clown-bobo')).status).toBe(404);
    expect((await admin.patch('/admin/services/svc-clown-bobo', { active: true })).status).toBe(200);
    expect((await browser(env.app).get('/services/svc-clown-bobo')).status).toBe(200);
  });
});

describe('bookings', () => {
  it('creates a booking with server-side pricing and returns it on retry', async () => {
    const b = browser(env.app);
    const req = bookingRequest({ startTime: '10:00' });
    const res = await b.post('/bookings', req, { 'idempotency-key': 'key-aaaaaaaa-1' });
    expect(res.status).toBe(201);
    expect(res.body.reference).toMatch(/^FR-[A-Z2-9]{6}$/);
    expect(res.body.status).toBe('pending_request');
    expect(res.body.customer.phone).toBe('+966551234567'); // normalised to E.164
    expect(res.body.pricing.subtotal).toBe(900 + 350);
    expect(res.body.pricing.vat).toBe(187.5);
    expect(res.body.pricing.total).toBe(1437.5);
    expect(res.body).not.toHaveProperty('internalNotes');
    expect(res.headers['set-cookie']).toMatch(/farha_customer=.*HttpOnly/);

    const again = await b.post('/bookings', req, { 'idempotency-key': 'key-aaaaaaaa-1' });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(res.body.id);

    const reused = await b.post('/bookings', bookingRequest({ startTime: '20:00' }), { 'idempotency-key': 'key-aaaaaaaa-1' });
    expect(reused.status).toBe(409);
  });

  it('ignores any price the client tries to send', async () => {
    const req = { ...bookingRequest({ startTime: '13:00' }), pricing: { total: 1 } };
    const res = await browser(env.app).post('/bookings', req, { 'idempotency-key': 'key-price-hack' });
    expect(res.status).toBe(422);
  });

  it('needs an idempotency key and valid fields', async () => {
    const b = browser(env.app);
    expect((await b.post('/bookings', bookingRequest())).status).toBe(422);
    const bad = bookingRequest({ phone: '12345', cityId: 'tabuk' });
    const res = await b.post('/bookings', bad, { 'idempotency-key': 'key-invalid-1' });
    expect(res.status).toBe(422);
    expect(res.body.fieldErrors.map((f: { field: string }) => f.field)).toContain('customer.phone');
  });

  it('refuses a city the service does not cover, and dates outside the window', async () => {
    const b = browser(env.app);
    const city = await b.post('/bookings', bookingRequest({ cityId: 'tabuk' }), { 'idempotency-key': 'key-city-1' });
    expect(city.status).toBe(422);
    expect(city.body.fieldErrors[0].messageKey).toBe('validation.cityNotServed');
    const tooSoon = await b.post('/bookings', bookingRequest({ date: todayISO() }), { 'idempotency-key': 'key-soon-1' });
    expect(tooSoon.status).toBe(409);
    expect(tooSoon.body.code).toBe('DATE_UNAVAILABLE');
  });

  it('never double-books the same service and time', async () => {
    const date = addDays(todayISO(), 33);
    const first = await browser(env.app).post('/bookings', bookingRequest({ date, startTime: '17:00', phone: '0551111111' }), { 'idempotency-key': 'key-slot-1' });
    expect(first.status).toBe(201);
    const clash = await browser(env.app).post('/bookings', bookingRequest({ date, startTime: '17:30', phone: '0552222222' }), { 'idempotency-key': 'key-slot-2' });
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe('DATE_UNAVAILABLE');
    const avail = await browser(env.app).get(`/services/svc-clown-bobo/availability?from=${date}&to=${date}`);
    expect(avail.body[0].slots).not.toContain('17:00');
    const later = await browser(env.app).post('/bookings', bookingRequest({ date, startTime: '20:00', phone: '0552222222' }), { 'idempotency-key': 'key-slot-3' });
    expect(later.status).toBe(201);
  });

  it('shows a booking only to the browser that made it', async () => {
    const mine = browser(env.app);
    const created = await mine.post('/bookings', bookingRequest({ date: addDays(todayISO(), 40), phone: '0553333333' }), { 'idempotency-key': 'key-own-1' });
    expect((await mine.get(`/bookings/${created.body.id}`)).status).toBe(200);
    expect((await mine.get(`/bookings/${created.body.reference}`)).status).toBe(200);
    expect((await mine.get('/bookings')).body.items.map((x: { id: string }) => x.id)).toContain(created.body.id);

    const stranger = browser(env.app);
    expect((await stranger.get(`/bookings/${created.body.id}`)).status).toBe(404);
    expect((await stranger.get('/bookings')).body.items).toEqual([]);
    expect((await stranger.post(`/bookings/${created.body.id}/cancellation-requests`, {})).status).toBe(404);
  });

  it('refuses bookings from blocked customers', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    const blocked = (await admin.get('/admin/customers?q=&pageSize=100')).body.items.find((c: { blocked: boolean }) => c.blocked);
    expect(blocked).toBeTruthy();
    const res = await browser(env.app).post('/bookings', bookingRequest({ date: addDays(todayISO(), 41), phone: blocked.phone }), { 'idempotency-key': 'key-blocked-1' });
    expect(res.status).toBe(403);
  });

  it('withdraws a pending request and handles change requests', async () => {
    const b = browser(env.app);
    const created = (await b.post('/bookings', bookingRequest({ date: addDays(todayISO(), 45), phone: '0554444444' }), { 'idempotency-key': 'key-life-1' })).body;
    const mod = await b.patch(`/bookings/${created.id}`, { modificationRequest: { message: 'Start at 18:00 please' } });
    expect(mod.status).toBe(200);
    expect(mod.body.modificationRequest.message).toBe('Start at 18:00 please');
    // Only one open change request at a time.
    expect((await b.patch(`/bookings/${created.id}`, { modificationRequest: { message: 'Another' } })).status).toBe(409);
    const cancel = await b.post(`/bookings/${created.id}/cancellation-requests`, { reason: 'Postponed' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');
    expect(cancel.body.history.at(-1).noteKey).toBe('history.withdrawn');
    expect((await b.post(`/bookings/${created.id}/cancellation-requests`, {})).body.code).toBe('TRANSITION_NOT_ALLOWED');
  });

  it('applies the cancellation window to confirmed bookings', async () => {
    const admin = await staffBrowser(env.app, 'ops@farha.example');
    const b = browser(env.app);
    // Two days ahead at 10:00 is under 72h: change requests are closed.
    const created = (await b.post('/bookings', bookingRequest({ date: addDays(todayISO(), 2), startTime: '21:00', phone: '0555555555' }), { 'idempotency-key': 'key-win-1' })).body;
    expect((await admin.post(`/admin/bookings/${created.id}/transitions`, { action: 'confirm' })).body.status).toBe('confirmed');
    expect((await b.patch(`/bookings/${created.id}`, { modificationRequest: { message: 'x' } })).body.code).toBe('POLICY_WINDOW_CLOSED');
    const later = (await b.post('/bookings', bookingRequest({ date: addDays(todayISO(), 30), startTime: '10:00', phone: '0555555555' }), { 'idempotency-key': 'key-win-2' })).body;
    await admin.post(`/admin/bookings/${later.id}/transitions`, { action: 'confirm' });
    const req = await b.post(`/bookings/${later.id}/cancellation-requests`, { reason: 'Travel' });
    expect(req.body.status).toBe('cancellation_requested');
  });
});

describe('customer sign-in with a one-time code', () => {
  it('signs in by phone and then lists every booking for that number', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    const sample = (await admin.get('/admin/customers?pageSize=100')).body.items.find((c: { bookingCount: number; blocked: boolean }) => c.bookingCount > 2 && !c.blocked);
    const b = browser(env.app);
    expect((await b.get('/bookings')).body.items).toEqual([]);

    const req = await b.post('/auth/otp/request', { phone: sample.phone });
    expect(req.status).toBe(200);
    expect(env.sms.at(-1)!.phone).toBe(sample.phone);
    const code = req.body.demoCode as string; // DEMO_MODE only
    expect(code).toMatch(/^\d{6}$/);

    const wrong = await b.post('/auth/otp/verify', { phone: sample.phone, code: code === '000000' ? '111111' : '000000' });
    expect(wrong.status).toBe(422);
    const ok = await b.post('/auth/otp/verify', { phone: sample.phone, code });
    expect(ok.status).toBe(200);
    expect((await b.get('/auth/session')).body.verified).toBe(true);
    expect((await b.get('/bookings')).body.items.length).toBe(sample.bookingCount);
    // A code works once.
    expect((await b.post('/auth/otp/verify', { phone: sample.phone, code })).status).toBe(422);

    await b.post('/auth/logout');
    expect((await b.get('/bookings')).body.items).toEqual([]);
  });

  it('locks a code after five wrong tries', async () => {
    const b = browser(env.app);
    const phone = '0559999999';
    const { demoCode } = (await b.post('/auth/otp/request', { phone })).body;
    for (let i = 0; i < 5; i++) await b.post('/auth/otp/verify', { phone, code: demoCode === '123456' ? '654321' : '123456' });
    expect((await b.post('/auth/otp/verify', { phone, code: demoCode })).status).toBe(422);
  });

  it('limits how many codes one number can request', async () => {
    const phone = '0558888888';
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await browser(env.app).post('/auth/otp/request', { phone })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('does not return codes when demo mode is off', async () => {
    const strict = await setup();
    try {
      const res = await browser(strict.app).post('/auth/otp/request', { phone: '0557777777' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ sent: true });
    } finally {
      await strict.app.close();
      await strict.db.end();
    }
  });
});

describe('contact form and request hygiene', () => {
  it('stores contact messages', async () => {
    const res = await browser(env.app).post('/contact-messages', { name: 'Sara', email: 'sara@example.com', subject: 'planning', message: 'Hello' });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^MSG-/);
  });

  it('blocks writes from other websites', async () => {
    const res = await browser(env.app).post('/contact-messages', { name: 'x', email: 'x@example.com', subject: 'x', message: 'x' }, { origin: 'https://evil.example' });
    expect(res.status).toBe(403);
  });

  it('sends security headers and no caching on API responses', async () => {
    const res = await browser(env.app).get('/categories');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('answers malformed JSON with a validation error, not a crash', async () => {
    const res = await env.app.inject({ method: 'POST', url: '/api/v1/contact-messages', headers: { 'content-type': 'application/json' }, payload: '{bad' });
    expect(res.statusCode).toBe(422);
  });
});
