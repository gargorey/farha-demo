import pg from 'pg';
import { migrations } from './migrations';

// Dates (YYYY-MM-DD) and numerics come back as strings, never as JS Dates / floats with drift.
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(1700, (v) => Number(v)); // numeric
pg.types.setTypeParser(20, (v) => Number(v)); // bigint (ids, counts)

export type Db = pg.Pool;
export type Queryable = pg.Pool | pg.PoolClient;

export function createPool(connectionString: string, ssl: boolean): Db {
  return new pg.Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: true } : undefined, max: 10 });
}

/** Runs fn inside a transaction; rolls back on any error. */
export async function tx<T>(db: Db, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function migrate(db: Db, log: (msg: string) => void = () => {}): Promise<void> {
  await tx(db, async (c) => {
    // One migrator at a time, even with several app instances starting together.
    await c.query('SELECT pg_advisory_xact_lock(727274)');
    await c.query('CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await c.query<{ id: string }>('SELECT id FROM schema_migrations')).rows.map((r) => r.id));
    for (const m of migrations) {
      if (done.has(m.id)) continue;
      await c.query(m.sql);
      await c.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
      log(`applied migration ${m.id}`);
    }
  });
}
