import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import type { AppConfig } from './config';
import type { Db } from './db/pool';
import { AppError } from './lib/errors';
import { devSmsSender, type SmsSender } from './lib/sms';
import { adminRoutes } from './routes/admin';
import { publicRoutes } from './routes/public';

export interface AppContext {
  cfg: AppConfig;
  db: Db;
  sms: SmsSender;
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function buildApp(cfg: AppConfig, db: Db, opts: { sms?: SmsSender } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: cfg.trustProxy,
    bodyLimit: 256 * 1024,
    logger:
      cfg.logLevel === 'silent'
        ? false
        : {
            level: cfg.logLevel,
            // Personal data stays out of logs: no cookies, no bodies, no query strings (searches can hold phone numbers).
            redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
            serializers: {
              req: (req) => ({ method: req.method, url: req.url.split('?')[0], reqId: req.id }),
            },
          },
  });
  const ctx: AppContext = { cfg, db, sms: opts.sms ?? devSmsSender(app.log) };

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    strictTransportSecurity: cfg.production ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
  await app.register(cookie);
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || cfg.allowedOrigins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept-Language', 'Idempotency-Key'],
    maxAge: 600,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ statusCode: 429, code: 'RATE_LIMITED', message: 'Too many requests, please wait a moment' }),
  });

  // Cross-site request forgery: a browser always sends Origin on these requests;
  // only our own site may change data. (Cookies are also SameSite.)
  app.addHook('onRequest', async (req) => {
    if (!UNSAFE.has(req.method) || !req.url.startsWith('/api/')) return;
    const origin = req.headers.origin;
    if (!origin) return; // not a browser (curl, server-to-server): no ambient cookies to abuse
    const self = `${req.protocol}://${req.headers.host}`;
    if (origin !== self && !cfg.allowedOrigins.includes(origin)) throw new AppError('FORBIDDEN', 'Origin not allowed');
  });

  app.addHook('onSend', async (req, reply) => {
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
  });

  app.setErrorHandler((err: FastifyError | AppError | ZodError, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.status).send({ code: err.code, message: err.message, fieldErrors: err.fieldErrors });
    }
    if (err instanceof ZodError) {
      const fieldErrors = err.issues.map((i) => ({
        field: i.path.join('.') || 'body',
        messageKey: i.message.startsWith('validation.') || i.message.startsWith('admin.') ? i.message : 'validation.invalid',
      }));
      return reply.code(422).send({ code: 'VALIDATION_ERROR', message: 'Invalid request', fieldErrors });
    }
    const status = (err as FastifyError).statusCode ?? 500;
    if (status === 429) return reply.code(429).send({ code: 'RATE_LIMITED', message: 'Too many requests, please wait a moment', fieldErrors: [] });
    if (status >= 400 && status < 500) {
      // Malformed JSON, wrong content type, body too large…
      return reply.code(status === 404 ? 404 : 422).send({ code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message: 'Invalid request', fieldErrors: [] });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ code: 'UNKNOWN', message: 'Something went wrong', fieldErrors: [] });
  });

  await app.register(
    async (api) => {
      publicRoutes(api, ctx);
      await api.register(async (admin) => adminRoutes(admin, ctx), { prefix: '/admin' });
    },
    { prefix: '/api/v1' },
  );

  // Optional: serve the built website and dashboard from the same origin (recommended:
  // cookies stay first-party and no cross-site settings are needed).
  const staticDir = cfg.staticDir ? resolve(cfg.staticDir) : undefined;
  if (staticDir && existsSync(staticDir)) {
    await app.register(fastifyStatic, { root: staticDir, index: ['index.html'] });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Not found', fieldErrors: [] });
      // Missing files (old asset hashes, typos) are a real 404, not the app page.
      if (req.method !== 'GET' || /\.[a-z0-9]+$/i.test(req.url.split('?')[0])) return reply.code(404).send();
      // Client-side routes of the website fall back to its index.html.
      return reply.sendFile(req.url.startsWith('/admin') ? 'admin/index.html' : 'index.html');
    });
  } else {
    app.setNotFoundHandler((_req, reply) => reply.code(404).send({ code: 'NOT_FOUND', message: 'Not found', fieldErrors: [] }));
  }

  return app;
}
