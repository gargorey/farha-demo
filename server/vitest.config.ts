import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Backend tests: real PostgreSQL (DATABASE_URL_TEST), one file at a time.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: { TZ: 'Asia/Riyadh' },
  },
});
