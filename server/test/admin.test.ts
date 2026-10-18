import { addDays, todayISO } from '@/utils/dates';
import { ORIGIN, STAFF_PASSWORD, bookingRequest, browser, setup, staffBrowser, type TestEnv } from './helpers';

let env: TestEnv;
beforeAll(async () => {
  env = await setup();
});
afterAll(async () => {
  await env.app.close();
  await env.db.end();
});

describe('staff sign-in', () => {
  it('requires a session for every admin endpoint', async () => {
    const b = browser(env.app);
    for (const url of ['/admin/dashboard', '/admin/bookings', '/admin/customers', '/admin/staff', '/admin/pricing', '/admin/audit-log']) {
      expect((await b.get(url)).status).toBe(401);
    }
  });

  it('gives the same answer for an unknown e-mail and a wrong password', async () => {
    const a = await browser(env.app).post('/admin/auth/login', { email: 'nobody@farha.example', password: 'whatever-123' });
    const b = await browser(env.app).post('/admin/auth/login', { email: 'finance@farha.example', password: 'wrong-password' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it('locks an account after five wrong passwords', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    await admin.put('/admin/staff/usr-lock', { id: 'usr-lock', name: 'Lock Test', email: 'lock@farha.example', role: 'viewer', active: true });
    await env.db.query(`UPDATE staff_users SET password_hash = (SELECT password_hash FROM staff_users WHERE id = 'usr-1'), must_change_password = false WHERE id = 'usr-lock'`);
    for (let i = 0; i < 5; i++) await browser(env.app).post('/admin/auth/login', { email: 'lock@farha.example', password: 'wrong-password' });
    const res = await browser(env.app).post('/admin/auth/login', { email: 'lock@farha.example', password: STAFF_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rate-limits sign-in attempts from one address', async () => {
    const b = browser(env.app);
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await b.post('/admin/auth/login', { email: 'x@farha.example', password: 'nope' })).status);
    expect(statuses.at(-1)).toBe(429);
  });

  it('refuses disabled accounts', async () => {
    const res = await browser(env.app).post('/admin/auth/login', { email: 'viewer@farha.example', password: STAFF_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('sets a strict, httpOnly cookie and signs out', async () => {
    const b = browser(env.app);
    const res = await b.post('/admin/auth/login', { email: 'ops@farha.example', password: STAFF_PASSWORD });
    expect(res.headers['set-cookie']).toMatch(/farha_staff=.*HttpOnly.*SameSite=Strict/i);
    expect(res.body.user.role).toBe('operations');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect((await b.get('/admin/auth/me')).status).toBe(200);
    await b.post('/admin/auth/logout');
    expect((await b.get('/admin/auth/me')).status).toBe(401);
  });
});

describe('permissions follow the role matrix', () => {
  it('lets finance view bookings but not change them', async () => {
    const finance = await staffBrowser(env.app, 'finance@farha.example');
    const list = await finance.get('/admin/bookings?status=pending_request&pageSize=1');
    expect(list.status).toBe(200);
    const id = list.body.items[0].id;
    expect((await finance.post(`/admin/bookings/${id}/transitions`, { action: 'start_review' })).status).toBe(403);
    expect((await finance.post(`/admin/bookings/${id}/notes`, { text: 'hi' })).status).toBe(403);
    expect((await finance.patch('/admin/services/svc-clown-bobo', { featured: true })).status).toBe(403);
    expect((await finance.get('/admin/pricing')).status).toBe(200);
  });

  it('lets operations run bookings but not pricing, promotions or staff', async () => {
    const ops = await staffBrowser(env.app, 'ops@farha.example');
    const pricing = (await ops.get('/admin/pricing')).body;
    expect((await ops.put('/admin/pricing', pricing)).status).toBe(403);
    expect((await ops.del('/admin/promotions/promo-1')).status).toBe(403);
    expect((await ops.put('/admin/staff/usr-2', { id: 'usr-2', name: 'x', email: 'ops@farha.example', role: 'admin', active: true })).status).toBe(403);
  });

  it('runs the booking lifecycle with history and audit', async () => {
    const ops = await staffBrowser(env.app, 'ops@farha.example');
    const customer = browser(env.app);
    const created = (await customer.post('/bookings', bookingRequest({ date: addDays(todayISO(), 25), phone: '0561234567' }), { 'idempotency-key': 'admin-life-1' })).body;

    // Rejecting needs a note.
    expect((await ops.post(`/admin/bookings/${created.id}/transitions`, { action: 'reject' })).status).toBe(422);
    const confirmed = await ops.post(`/admin/bookings/${created.id}/transitions`, { action: 'confirm', note: 'See you there' });
    expect(confirmed.body.status).toBe('confirmed');
    expect(confirmed.body.pricing.isEstimate).toBe(false);
    expect(confirmed.body.history.map((h: { noteKey: string }) => h.noteKey)).toEqual(['history.submitted', 'history.staffReviewing', 'history.staffConfirmed']);
    // Cannot complete before the event date.
    expect((await ops.post(`/admin/bookings/${created.id}/transitions`, { action: 'complete' })).body.code).toBe('TRANSITION_NOT_ALLOWED');
    expect((await ops.post(`/admin/bookings/${created.id}/transitions`, { action: 'start_review' })).status).toBe(409);

    const noted = await ops.post(`/admin/bookings/${created.id}/notes`, { text: 'Customer prefers WhatsApp' });
    expect(noted.body.internalNotes[0].by).toBe('Abdulaziz Alharbi');
    // Staff notes never reach the customer.
    const seen = await customer.get(`/bookings/${created.id}`);
    expect(seen.body.status).toBe('confirmed');
    expect(seen.body).not.toHaveProperty('internalNotes');

    const audit = (await ops.get('/admin/audit-log?limit=5')).body;
    expect(audit[0]).toMatchObject({ action: 'booking.note', target: created.reference, by: 'Abdulaziz Alharbi' });
  });

  it('resolves change requests', async () => {
    const ops = await staffBrowser(env.app, 'ops@farha.example');
    const list = await ops.get('/admin/bookings?status=needs_action&pageSize=200');
    const withMod = list.body.items.find((b: { modificationRequest?: unknown }) => b.modificationRequest);
    expect(withMod).toBeTruthy();
    const res = await ops.post(`/admin/bookings/${withMod.id}/modification-request/resolve`, { note: 'Done' });
    expect(res.body.modificationRequest).toBeUndefined();
    expect((await ops.post(`/admin/bookings/${withMod.id}/modification-request/resolve`, {})).status).toBe(409);
  });
});

describe('lists, reports and settings', () => {
  it('filters, searches and pages bookings', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    const page1 = (await admin.get('/admin/bookings?pageSize=10&page=1&sort=event-asc')).body;
    const page2 = (await admin.get('/admin/bookings?pageSize=10&page=2&sort=event-asc')).body;
    expect(page1.items.length).toBe(10);
    expect(page1.total).toBeGreaterThanOrEqual(150);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
    const ref = page1.items[3].reference;
    const found = (await admin.get(`/admin/bookings?q=${encodeURIComponent(ref)}`)).body;
    expect(found.items.map((b: { reference: string }) => b.reference)).toEqual([ref]);
    const riyadh = (await admin.get('/admin/bookings?cityId=riyadh&pageSize=500')).body;
    expect(riyadh.items.every((b: { event: { cityId: string } }) => b.event.cityId === 'riyadh')).toBe(true);
    // LIKE wildcards are matched literally.
    expect((await admin.get('/admin/bookings?q=%25')).body.total).toBe(0);
  });

  it('builds the overview and the report', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    const dash = (await admin.get('/admin/dashboard')).body;
    expect(dash.needsAction).toBeGreaterThan(0);
    expect(dash.revenueByMonth.length).toBeGreaterThanOrEqual(5);
    const from = addDays(todayISO(), -90);
    const report = (await admin.get(`/admin/reports/summary?from=${from}&to=${todayISO()}`)).body;
    expect(report.grossRevenue).toBeGreaterThan(0);
    expect(report.netRevenue + report.vatCollected).toBeCloseTo(report.grossRevenue, 1);
  });

  it('lists customers with booking totals and lets staff tag and block', async () => {
    const ops = await staffBrowser(env.app, 'ops@farha.example');
    const list = (await ops.get('/admin/customers?pageSize=5')).body;
    expect(list.items.length).toBe(5);
    expect(list.total).toBeGreaterThan(40);
    const c = list.items[0];
    const updated = await ops.patch(`/admin/customers/${c.id}`, { tags: ['vip'], notes: 'Prefers mornings' });
    expect(updated.body.tags).toEqual(['vip']);
    // Contact details belong to the customer and cannot be changed by staff.
    expect((await ops.patch(`/admin/customers/${c.id}`, { phone: '+966500000000' })).status).toBe(422);
    expect((await ops.get('/admin/customers?tag=vip')).body.items.some((x: { id: string }) => x.id === c.id)).toBe(true);
  });

  it('keeps server-owned service fields and recomputes the starting price', async () => {
    const ops = await staffBrowser(env.app, 'ops@farha.example');
    const svc = (await ops.get('/admin/services/svc-clown-bobo')).body;
    const packages = svc.packages.map((p: { price: number }, i: number) => ({ ...p, price: i === 0 ? 700 : p.price }));
    const res = await ops.patch('/admin/services/svc-clown-bobo', { ...svc, packages, rating: 1, reviewCount: 999 });
    expect(res.status).toBe(200);
    expect(res.body.startingPrice).toBe(700);
    expect(res.body.rating).toBe(svc.rating);
    expect(res.body.reviewCount).toBe(svc.reviewCount);
    expect((await browser(env.app).get('/services/svc-clown-bobo')).body.startingPrice).toBe(700);
    // Unknown fields are refused, not silently stored.
    expect((await ops.patch('/admin/services/svc-clown-bobo', { isAdmin: true })).status).toBe(422);
  });

  it('applies pricing settings to the website and new bookings', async () => {
    const admin = await staffBrowser(env.app, 'finance@farha.example');
    const s = (await admin.get('/admin/pricing')).body;
    const res = await admin.put('/admin/pricing', { ...s, travelFees: { ...s.travelFees, riyadh: 100 } });
    expect(res.status).toBe(200);
    expect((await browser(env.app).get('/cities')).body.find((c: { id: string }) => c.id === 'riyadh').travelFee).toBe(100);
    const booking = (await browser(env.app).post('/bookings', bookingRequest({ date: addDays(todayISO(), 50), phone: '0562222222' }), { 'idempotency-key': 'admin-fee-1' })).body;
    expect(booking.pricing.lines.find((l: { kind: string }) => l.kind === 'travel').amount).toBe(100);
    expect((await admin.put('/admin/pricing', { ...s, vat: { ...s.vat, rate: 5 } })).status).toBe(422);
    await admin.put('/admin/pricing', s);
  });

  it('keeps promotion codes unique', async () => {
    const fin = await staffBrowser(env.app, 'finance@farha.example');
    const promo = { id: 'promo-new', code: 'national95', name: { ar: 'x', en: 'x' }, kind: 'percent', value: 10, minSubtotal: 0, startsOn: todayISO(), endsOn: addDays(todayISO(), 5), active: true, categoryIds: [] };
    const clash = await fin.put('/admin/promotions/promo-new', promo);
    expect(clash.status).toBe(409);
    expect(clash.body.fieldErrors[0].messageKey).toBe('admin.promotions.codeTaken');
    const ok = await fin.put('/admin/promotions/promo-new', { ...promo, code: 'winter10', uses: 500 });
    expect(ok.body.code).toBe('WINTER10');
    expect(ok.body.uses).toBe(0);
    expect((await fin.del('/admin/promotions/promo-new')).status).toBe(204);
  });
});

describe('staff accounts', () => {
  it('creates a member with a one-time password they must change', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    const created = await admin.put('/admin/staff/usr-new', { id: 'usr-new', name: 'New Person', email: 'new@farha.example', role: 'operations', active: true });
    expect(created.status).toBe(200);
    const temp = created.body.temporaryPassword as string;
    expect(temp).toMatch(/^[\w]{4}-[\w]{4}-[\w]{4}-[\w]{4}$/);

    const b = browser(env.app);
    const login = await b.post('/admin/auth/login', { email: 'NEW@farha.example', password: temp });
    expect(login.body.mustChangePassword).toBe(true);
    expect((await b.get('/admin/bookings')).status).toBe(403);
    expect((await b.post('/admin/auth/password', { currentPassword: temp, newPassword: 'short' })).status).toBe(422);
    expect((await b.post('/admin/auth/password', { currentPassword: temp, newPassword: 'a much better passphrase 42' })).status).toBe(200);
    expect((await b.get('/admin/bookings?pageSize=1')).status).toBe(200);

    // Disabling the account ends its sessions straight away.
    await admin.put('/admin/staff/usr-new', { id: 'usr-new', name: 'New Person', email: 'new@farha.example', role: 'operations', active: false });
    expect((await b.get('/admin/bookings?pageSize=1')).status).toBe(401);
  });

  it('protects against locking everyone out', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    expect((await admin.put('/admin/staff/usr-1', { id: 'usr-1', name: 'Hima', email: 'owner@farha.example', role: 'viewer', active: true })).status).toBe(403);
    expect((await admin.put('/admin/staff/usr-2', { id: 'usr-2', name: 'Abdulaziz Alharbi', email: 'owner@farha.example', role: 'operations', active: true })).status).toBe(409);
    expect((await admin.post('/admin/staff/usr-1/reset-password')).status).toBe(403);
  });

  it('resets another member’s password', async () => {
    const admin = await staffBrowser(env.app, 'owner@farha.example');
    const ops = await staffBrowser(env.app, 'support@farha.example');
    const res = await admin.post('/admin/staff/usr-4/reset-password');
    expect(res.body.temporaryPassword).toBeTruthy();
    expect((await ops.get('/admin/dashboard')).status).toBe(401);
  });

  it('only allows our own website to call the admin API from a browser', async () => {
    const res = await env.app.inject({
      method: 'OPTIONS',
      url: '/api/v1/admin/auth/login',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await env.app.inject({ method: 'OPTIONS', url: '/api/v1/admin/auth/login', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } });
    expect(ok.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
  });
});
