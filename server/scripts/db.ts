/**
 * Database commands:
 *   npm run db:migrate                          apply schema changes
 *   npm run db:seed                             starting catalogue only (live site)
 *   npm run db:seed -- --sample                 plus sample customers, bookings, promotions and staff (demo/dev)
 *   npm run db:create-admin -- --email a@b.c --name "Hima"   first administrator; prints a one-time password
 */
process.env.TZ = 'Asia/Riyadh';

import { parseArgs } from 'node:util';
import { createPool, migrate } from '../src/db/pool';
import { seed } from '../src/db/seed';
import { hashPassword, temporaryPassword } from '../src/lib/security';
import { email as emailSchema } from '../src/lib/schemas';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { sample: { type: 'boolean', default: false }, email: { type: 'string' }, name: { type: 'string' } },
});

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const ssl = (process.env.DATABASE_SSL ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true';
  const db = createPool(url, ssl);
  try {
    await migrate(db, console.log);
    const cmd = positionals[0];
    if (cmd === 'seed') {
      if (values.sample && process.env.NODE_ENV === 'production' && process.env.ALLOW_SAMPLE_DATA !== 'true') {
        throw new Error('Refusing to load sample data in production (set ALLOW_SAMPLE_DATA=true for a demo deployment)');
      }
      const password = process.env.SEED_STAFF_PASSWORD ?? (process.env.NODE_ENV === 'production' ? undefined : 'farha-dev-password');
      const r = await seed(db, { sampleData: values.sample, sampleStaffPassword: password });
      console.log(r.inserted ? `Seeded${values.sample ? ' with sample data' : ''}.` : 'Database already has data; nothing changed.');
      if (r.inserted && values.sample) {
        console.log(password ? `Sample staff (e.g. owner@farha.example) can sign in with SEED_STAFF_PASSWORD${process.env.SEED_STAFF_PASSWORD ? '' : ' = farha-dev-password'}.` : 'Sample staff have no password; use db:create-admin.');
      }
    } else if (cmd === 'create-admin') {
      const email = emailSchema.parse(values.email);
      const name = (values.name ?? '').trim();
      if (!name) throw new Error('--name is required');
      const temp = temporaryPassword();
      await db.query(
        `INSERT INTO staff_users (id, name, email, role, active, password_hash, must_change_password)
         VALUES ($1, $2, $3, 'admin', true, $4, true)
         ON CONFLICT (lower(email)) DO UPDATE SET role = 'admin', active = true, password_hash = $4, must_change_password = true`,
        [`usr-${crypto.randomUUID().slice(0, 8)}`, name, email, await hashPassword(temp)],
      );
      console.log(`Administrator ${email} ready. One-time password (change it at first sign-in):\n\n  ${temp}\n`);
    } else if (cmd !== 'migrate') {
      throw new Error(`Unknown command ${cmd}`);
    }
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
