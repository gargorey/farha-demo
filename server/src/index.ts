// All dates and policy windows are in Saudi time.
process.env.TZ = 'Asia/Riyadh';

import { buildApp } from './app';
import { loadConfig } from './config';
import { createPool, migrate } from './db/pool';

async function main() {
  const cfg = loadConfig();
  const db = createPool(cfg.databaseUrl, cfg.databaseSsl);
  await migrate(db, (m) => console.log(m));
  const app = await buildApp(cfg, db);
  if (cfg.demoMode) app.log.warn('DEMO_MODE is on: one-time codes are returned in API responses. Never use with real customers.');
  const shutdown = async () => {
    await app.close();
    await db.end();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  await app.listen({ host: cfg.host, port: cfg.port });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
