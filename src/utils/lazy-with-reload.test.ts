import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadOnceForNewVersion } from './lazy-with-reload';

describe('isChunkLoadError', () => {
  it('recognises stale code-file errors from each browser', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/ServicesPage-BK721Eeb.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
  });
  it('ignores other errors', () => {
    expect(isChunkLoadError(new Error('Something else'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloadOnceForNewVersion', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it('reloads once, then stops to avoid a loop', () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload });
    expect(reloadOnceForNewVersion()).toBe(true);
    expect(reloadOnceForNewVersion()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
