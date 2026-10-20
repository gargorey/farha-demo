import { ApiError } from '@/models';
import { readJSON, removeKey, writeJSON } from '@/utils/storage';
import type { CustomerSessionInfo } from '../api/client';

/**
 * DEMO sign-in for the browser demo. It mirrors the backend's real flow
 * (mobile number + 6-digit one-time code) but nothing is sent: the code is
 * shown on screen and the "session" lives in this browser's localStorage.
 * Not secure; never use this for real accounts.
 */
const SESSION_KEY = 'farha.demo.customer-session.v1';
const CODE_KEY = 'farha.demo.customer-otp.v1';
const CODE_TTL_MS = 5 * 60_000;

interface PendingCode {
  phone: string;
  code: string;
  expiresAt: number;
}

const randomCode = () => String(Math.floor(100_000 + Math.random() * 900_000));

export const demoCustomerAuth = {
  session(): CustomerSessionInfo {
    const phone = readJSON<string | null>(SESSION_KEY, null);
    return phone ? { verified: true, phone } : { verified: false };
  },
  requestCode(phone: string): { sent: boolean; demoCode: string } {
    const pending: PendingCode = { phone, code: randomCode(), expiresAt: Date.now() + CODE_TTL_MS };
    writeJSON(CODE_KEY, pending, 'session');
    return { sent: true, demoCode: pending.code };
  },
  verify(phone: string, code: string): CustomerSessionInfo {
    const pending = readJSON<PendingCode | null>(CODE_KEY, null, 'session');
    if (!pending || pending.phone !== phone || pending.code !== code || pending.expiresAt < Date.now()) {
      throw new ApiError('VALIDATION_ERROR', 422, 'Invalid or expired code');
    }
    removeKey(CODE_KEY, 'session');
    writeJSON(SESSION_KEY, phone);
    return { verified: true, phone };
  },
  signOut(): void {
    removeKey(SESSION_KEY);
    removeKey(CODE_KEY, 'session');
  },
};
