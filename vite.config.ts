import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Hash-routed builds use relative asset paths so they run from any folder or static host.
export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, process.cwd()).VITE_ROUTER_MODE === 'hash' ? './' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Two apps from one codebase: the customer website (/) and the admin dashboard (/admin/).
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)),
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          i18n: ['i18next', 'react-i18next'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Backend tests need PostgreSQL and run separately: npm run server:test
    exclude: [...configDefaults.exclude, 'server/**'],
  },
}));
