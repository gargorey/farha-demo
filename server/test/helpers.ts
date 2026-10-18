import type { FastifyInstance, InjectOptions } from 'fastify';
import { addDays, todayISO } from '@/utils/dates';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createPool, migrate, type Db } from '../src/db/pool';
import { seed } from '../src/db/seed';

export const STAFF_PASSWORD = 'test-staff-password-123';
export const ORIGIN = 'http://localhost:5173';

export interface TestEnv {
  app: FastifyInstance;
  db: Db;
  sms: { phone: string; text: string }[];
}

/** Fresh database with the sample data, and an app instance on it. */
export async function setup(overrides: Record<string, string> = {}): Promise<TestEnv> {
  const url = process.env.DATABASE_URL_TEST ?? 'postgres://postgres@localhost:5432/farha_test';
  const cfg = loadConfig({ NODE_ENV: 'test', DATABASE_URL: url, LOG_LEVEL: 'silent', ALLOWED_ORIGINS: ORIGIN, ...overrides });
  const db = createPool(url, false);
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(db);
  await seed(db, { sampleData: true, sampleStaffPassword: STAFF_PASSWORD });
  const sms: TestEnv['sms'] = [];
  const app = await buildApp(cfg, db, { sms: { send: async (phone, text) => void sms.push({ phone, text }) } });
  return { app, db, sms };
}

let ipCounter = 1;

/** A browser: keeps its cookies and its own IP (so rate limits of one test do not affect another). */
export function browser(app: FastifyInstance) {
  const jar = new Map<string, string>();
  const ip = `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
  async function call(method: InjectOptions['method'], url: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await app.inject({
      method,
      url: `/api/v1${url}`,
      remoteAddress: ip,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(method !== 'GET' ? { origin: ORIGIN } : {}),
        ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...headers,
      },
      ...(body !== undefined ? { payload: JSON.stringify(body) } : {}),
    });
    for (const c of res.cookies as { name: string; value: string; maxAge?: number }[]) {
      if (!c.value || c.maxAge === 0) jar.delete(c.name);
      else jar.set(c.name, c.value);
    }
    const json = res.body ? (() => { try { return JSON.parse(res.body); } catch { return res.body; } })() : undefined;
    return { status: res.statusCode, body: json, headers: res.headers, cookies: res.cookies };
  }
  return {
    ip,
    jar,
    get: (url: string, headers?: Record<string, string>) => call('GET', url, undefined, headers),
    post: (url: string, body?: unknown, headers?: Record<string, string>) => call('POST', url, body ?? {}, headers),
    put: (url: string, body: unknown) => call('PUT', url, body),
    patch: (url: string, body: unknown) => call('PATCH', url, body),
    del: (url: string) => call('DELETE', url),
  };
}

export async function staffBrowser(app: FastifyInstance, email: string, password = STAFF_PASSWORD) {
  const b = browser(app);
  const res = await b.post('/admin/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return b;
}

/** A valid booking request a few weeks ahead for a service that exists in the sample catalogue. */
export function bookingRequest(overrides: { date?: string; startTime?: string; phone?: string; cityId?: string } = {}) {
  const date = overrides.date ?? addDays(todayISO(), 20);
  return {
    selection: { serviceId: 'svc-clown-bobo', packageId: 'party', addOns: [{ addOnId: 'face', quantity: 1 }] },
    event: {
      eventTypeId: 'birthday',
      date,
      startTime: overrides.startTime ?? '17:00',
      extraHours: 0,
      cityId: overrides.cityId ?? 'riyadh',
      venue: 'Home – Al Malqa',
      attendees: 20,
      notes: 'Theme: space',
    },
    customer: { fullName: 'Sara Alqahtani', phone: overrides.phone ?? '0551234567', email: 'sara@example.com', contactMethod: 'whatsapp' },
  };
}
