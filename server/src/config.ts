import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v == null ? fallback : v === 'true' || v === '1'));

/**
 * All settings come from environment variables (see server/.env.example).
 * Secrets are never committed; the server refuses to start in production without them.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().default(8080),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_SSL: bool(production),
    APP_SECRET: production
      ? z.string().min(32, 'APP_SECRET must be at least 32 random characters in production')
      : z.string().min(16).default('dev-only-secret-change-me-0123456789'),
    ALLOWED_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:4173')
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
    COOKIE_SECURE: bool(production),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    TRUST_PROXY: bool(false),
    SERVE_STATIC_DIR: z.string().optional(),
    DEMO_MODE: bool(false),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default(production ? 'info' : 'debug'),
  });
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${msg}`);
  }
  const c = parsed.data;
  if (c.COOKIE_SAMESITE === 'none' && !c.COOKIE_SECURE) throw new Error('COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
  return {
    env: c.NODE_ENV,
    production: c.NODE_ENV === 'production',
    host: c.HOST,
    port: c.PORT,
    databaseUrl: c.DATABASE_URL,
    databaseSsl: c.DATABASE_SSL,
    secret: c.APP_SECRET,
    allowedOrigins: c.ALLOWED_ORIGINS,
    cookieSecure: c.COOKIE_SECURE,
    cookieSameSite: c.COOKIE_SAMESITE,
    trustProxy: c.TRUST_PROXY,
    staticDir: c.SERVE_STATIC_DIR,
    /** Demo deployments only: one-time codes are returned in the API response instead of an SMS. */
    demoMode: c.DEMO_MODE,
    logLevel: c.LOG_LEVEL,
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
