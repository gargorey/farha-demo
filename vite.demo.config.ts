import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import base from './vite.config';

/**
 * Builds the whole demo into ONE self-contained HTML file (dist-demo/index.html)
 * that can be opened locally, emailed or hosted anywhere. Uses hash routing.
 */
export default defineConfig((env) => {
  const merged: UserConfig = mergeConfig(typeof base === 'function' ? base(env) : base, {
    base: './',
    plugins: [viteSingleFile()],
    build: { outDir: 'dist-demo' },
    define: { 'import.meta.env.VITE_ROUTER_MODE': JSON.stringify('hash') },
  });
  // Everything is inlined into one file, so vendor chunk splitting doesn't apply.
  delete (merged.build?.rollupOptions?.output as { manualChunks?: unknown } | undefined)?.manualChunks;
  return merged;
});
