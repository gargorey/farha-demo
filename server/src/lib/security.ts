import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const scryptAsync = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));

// scrypt cost: N=2^15, r=8, p=1 (about 32 MB and ~50-100 ms per hash).
const N = 32768, R = 8, P = 1, KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

// Used when the e-mail is unknown, so sign-in takes the same time either way.
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    dummyHash ??= hashPassword('not-a-real-password');
    await verifyPassword(password, await dummyHash);
    return false;
  }
  const [alg, n, r, p, salt, key] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64url');
  const actual = await scryptAsync(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Password rules for staff accounts. Returns a reason when the password is not acceptable. */
export function passwordProblem(password: string, email: string): string | null {
  if (password.length < 12) return 'Use at least 12 characters';
  if (password.length > 200) return 'Too long';
  if (password.toLowerCase().includes(email.split('@')[0].toLowerCase())) return 'Do not include your e-mail name';
  if (new Set(password).size < 6) return 'Too repetitive';
  return null;
}

/** Readable one-time password for new staff accounts and resets (about 95 bits). */
export function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 16; i++) out += alphabet[randomInt(alphabet.length)];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12)}`;
}

export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const hmac = (secret: string, value: string) => createHmac('sha256', secret).update(value).digest('hex');

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Booking reference shown to customers, e.g. FR-7KQ2MX (no 0/O/1/I). */
export function bookingReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[randomInt(alphabet.length)];
  return `FR-${out}`;
}

export const sixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
