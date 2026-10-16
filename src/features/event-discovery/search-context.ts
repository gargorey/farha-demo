import { readJSON, writeJSON } from '@/utils/storage';

/** What the customer told us while searching/planning; used to pre-fill the booking form. */
export interface SearchContext {
  eventTypeId?: string;
  cityId?: string;
  date?: string;
  attendees?: number;
}

const KEY = 'farha.searchContext';

export const searchContext = {
  get: (): SearchContext => readJSON<SearchContext>(KEY, {}, 'session'),
  merge: (patch: SearchContext) => {
    const next = { ...searchContext.get() };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === null) delete next[k as keyof SearchContext];
      else (next as Record<string, unknown>)[k] = v;
    }
    writeJSON(KEY, next, 'session');
  },
};
