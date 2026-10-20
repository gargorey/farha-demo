import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'farha.chunk-reload-at';
// Don't reload again if we already tried within this window (avoids a reload loop when a file is truly missing).
const RELOAD_WINDOW_MS = 10_000;

/** True for the browser errors thrown when a code-split file can't be downloaded (usually after a new deploy). */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed|Unable to preload CSS/i.test(
    message,
  );
}

function readReloadedAt(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Reload the page once to pick up the latest deploy. Returns false when we already
 * reloaded recently, so the caller should show an error instead.
 */
export function reloadOnceForNewVersion(): boolean {
  if (Date.now() - readReloadedAt() < RELOAD_WINDOW_MS) return false;
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Without storage we can't guard against a loop, so don't auto-reload.
    return false;
  }
  window.location.reload();
  return true;
}

/** Like React.lazy, but recovers from stale code files after a deploy by reloading the page once. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same constraint as React.lazy
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error) && reloadOnceForNewVersion()) {
        // Keep the loading state up while the page reloads.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}
