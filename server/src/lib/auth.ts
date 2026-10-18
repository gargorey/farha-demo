import type { FastifyReply, FastifyRequest } from 'fastify';
import { can } from '@/admin/auth/roles';
import type { Permission, RoleId } from '@/admin/models';
import type { AppConfig } from '../config';
import type { Db, Queryable } from '../db/pool';
import { AppError } from './errors';
import { newToken, sha256 } from './security';

/**
 * Cookie sessions. The browser holds a random token in an httpOnly cookie; the
 * database keeps only its SHA-256 hash, so a leaked database cannot be replayed.
 */

export const STAFF_COOKIE = 'farha_staff';
export const CUSTOMER_COOKIE = 'farha_customer';
const STAFF_IDLE_MS = 2 * 3_600_000; // signed out after 2 hours without activity
const STAFF_ABSOLUTE_MS = 12 * 3_600_000; // and after 12 hours in any case
const CUSTOMER_TTL_MS = 30 * 86_400_000;

export interface StaffPrincipal {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  mustChangePassword: boolean;
  sessionHash: string;
}

export function cookieOptions(cfg: AppConfig, kind: 'staff' | 'customer', maxAgeMs: number) {
  // Staff cookies are never sent on cross-site navigations unless the deployment is cross-site by design.
  const sameSite = kind === 'staff' && cfg.cookieSameSite === 'lax' ? 'strict' : cfg.cookieSameSite;
  return { path: '/api', httpOnly: true, secure: cfg.cookieSecure, sameSite, maxAge: Math.floor(maxAgeMs / 1000) } as const;
}

// ---------- Staff ----------

export async function createStaffSession(db: Queryable, cfg: AppConfig, reply: FastifyReply, staffId: string) {
  const token = newToken();
  await db.query(`INSERT INTO staff_sessions (token_hash, staff_id, expires_at) VALUES ($1, $2, now() + $3 * interval '1 millisecond')`, [
    sha256(token),
    staffId,
    STAFF_ABSOLUTE_MS,
  ]);
  reply.setCookie(STAFF_COOKIE, token, cookieOptions(cfg, 'staff', STAFF_ABSOLUTE_MS));
}

export async function getStaff(db: Db, req: FastifyRequest): Promise<StaffPrincipal | null> {
  const token = req.cookies[STAFF_COOKIE];
  if (!token || token.length > 100) return null;
  const hash = sha256(token);
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.must_change_password, s.last_seen_at
       FROM staff_sessions s JOIN staff_users u ON u.id = s.staff_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND s.last_seen_at > now() - $2 * interval '1 millisecond' AND u.active`,
    [hash, STAFF_IDLE_MS],
  );
  const r = rows[0];
  if (!r) return null;
  // Touch the session at most once a minute.
  if (Date.now() - new Date(r.last_seen_at).getTime() > 60_000) {
    await db.query('UPDATE staff_sessions SET last_seen_at = now() WHERE token_hash = $1', [hash]);
    await db.query('UPDATE staff_users SET last_active_at = now() WHERE id = $1', [r.id]);
  }
  return { id: r.id, name: r.name, email: r.email, role: r.role, mustChangePassword: r.must_change_password, sessionHash: hash };
}

/**
 * Every admin endpoint goes through this. Viewing needs any active staff account;
 * changes need the permission from the same matrix the dashboard uses.
 */
export async function requireStaff(db: Db, req: FastifyRequest, permission?: Permission): Promise<StaffPrincipal> {
  const staff = await getStaff(db, req);
  if (!staff) throw new AppError('UNAUTHORIZED', 'Sign in required');
  if (staff.mustChangePassword) throw new AppError('FORBIDDEN', 'PASSWORD_CHANGE_REQUIRED');
  if (permission && !can(staff.role, permission)) throw new AppError('FORBIDDEN', 'Missing permission');
  return staff;
}

export const revokeStaffSessions = (db: Queryable, staffId: string, exceptHash?: string) =>
  db.query('DELETE FROM staff_sessions WHERE staff_id = $1 AND token_hash <> COALESCE($2, \'\')', [staffId, exceptHash ?? null]);

// ---------- Customers ----------

export interface CustomerSession {
  hash: string;
  verifiedPhone: string | null;
  bookingIds: string[];
}

export async function getCustomerSession(db: Queryable, req: FastifyRequest): Promise<CustomerSession | null> {
  const token = req.cookies[CUSTOMER_COOKIE];
  if (!token || token.length > 100) return null;
  const hash = sha256(token);
  const { rows } = await db.query('SELECT verified_phone, booking_ids FROM customer_sessions WHERE token_hash = $1 AND expires_at > now()', [hash]);
  return rows[0] ? { hash, verifiedPhone: rows[0].verified_phone, bookingIds: rows[0].booking_ids } : null;
}

export async function ensureCustomerSession(db: Queryable, cfg: AppConfig, req: FastifyRequest, reply: FastifyReply): Promise<CustomerSession> {
  const existing = await getCustomerSession(db, req);
  if (existing) return existing;
  const token = newToken();
  const hash = sha256(token);
  await db.query(`INSERT INTO customer_sessions (token_hash, expires_at) VALUES ($1, now() + $2 * interval '1 millisecond')`, [hash, CUSTOMER_TTL_MS]);
  reply.setCookie(CUSTOMER_COOKIE, token, cookieOptions(cfg, 'customer', CUSTOMER_TTL_MS));
  return { hash, verifiedPhone: null, bookingIds: [] };
}

/** SQL condition: the booking (alias b) belongs to this customer session. $1 = booking ids, $2 = verified phone. */
export const OWNED_BY_SESSION = `(b.id = ANY($1::text[]) OR ($2::text IS NOT NULL AND b.customer_id = (SELECT id FROM customers WHERE phone = $2)))`;
