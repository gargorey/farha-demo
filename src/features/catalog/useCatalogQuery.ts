import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ServiceQuery, ServiceSort } from '@/models';

export type DurationBucket = 'short' | 'medium' | 'long';
const durationBuckets: Record<DurationBucket, Pick<ServiceQuery, 'maxDurationMinutes' | 'minDurationMinutes'>> = {
  short: { maxDurationMinutes: 45 },
  medium: { maxDurationMinutes: 90 },
  long: { minDurationMinutes: 120 },
};
const SORTS: ServiceSort[] = ['relevance', 'price-asc', 'price-desc', 'popularity', 'rating'];

export interface CatalogFilters {
  q: string;
  categories: string[];
  eventType: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  duration: '' | DurationBucket;
  sort: ServiceSort;
  date: string;
}

/** Catalogue filters live in the URL so results are shareable and survive refresh/back. */
export function useCatalogQuery() {
  const [params, setParams] = useSearchParams();

  const filters: CatalogFilters = useMemo(() => {
    const sort = params.get('sort') as ServiceSort;
    const duration = params.get('duration') as DurationBucket;
    return {
      q: params.get('q') ?? '',
      categories: (params.get('category') ?? '').split(',').filter(Boolean),
      eventType: params.get('event') ?? '',
      city: params.get('city') ?? '',
      minPrice: params.get('min') ?? '',
      maxPrice: params.get('max') ?? '',
      duration: duration in durationBuckets ? duration : '',
      sort: SORTS.includes(sort) ? sort : 'relevance',
      date: params.get('date') ?? '',
    };
  }, [params]);

  const query: ServiceQuery = useMemo(
    () => ({
      q: filters.q || undefined,
      categoryIds: filters.categories.length ? filters.categories : undefined,
      eventTypeId: filters.eventType || undefined,
      cityId: filters.city || undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      ...(filters.duration ? durationBuckets[filters.duration] : {}),
      sort: filters.sort,
    }),
    [filters],
  );

  const update = useCallback(
    (patch: Partial<CatalogFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const set = (key: string, value: string) => (value ? next.set(key, value) : next.delete(key));
          if ('q' in patch) set('q', patch.q ?? '');
          if ('categories' in patch) set('category', (patch.categories ?? []).join(','));
          if ('eventType' in patch) set('event', patch.eventType ?? '');
          if ('city' in patch) set('city', patch.city ?? '');
          if ('minPrice' in patch) set('min', patch.minPrice ?? '');
          if ('maxPrice' in patch) set('max', patch.maxPrice ?? '');
          if ('duration' in patch) set('duration', patch.duration ?? '');
          if ('sort' in patch) set('sort', patch.sort === 'relevance' ? '' : (patch.sort ?? ''));
          if ('date' in patch) set('date', patch.date ?? '');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  return { filters, query, update, reset };
}
