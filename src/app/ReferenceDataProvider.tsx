import { useMemo, type ReactNode } from 'react';
import { applyServerSettings } from '@/config/business';
import { api } from '@/services/api';
import { useAsync } from '@/hooks/useAsync';
import { ReferenceDataContext, type ReferenceData } from '@/hooks/useReferenceData';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';

/** Loads categories, event types, cities (and, with the backend, its business rules) once, for the whole app. */
export function ReferenceDataProvider({ children }: { children: ReactNode }) {
  const { data, error, loading, reload } = useAsync(
    () =>
      Promise.all([
        api.listCategories(),
        api.listEventTypes(),
        api.listCities(),
        api.getPublicSettings().then((s) => s && applyServerSettings(s)),
      ]),
    [],
  );

  const value = useMemo<ReferenceData | null>(() => {
    if (!data) return null;
    const [categories, eventTypes, cities] = data;
    return {
      categories,
      eventTypes,
      cities,
      categoryById: (id) => categories.find((c) => c.id === id),
      eventTypeById: (id) => eventTypes.find((e) => e.id === id),
      cityById: (id) => cities.find((c) => c.id === id),
    };
  }, [data]);

  if (loading && !value) return <LoadingBlock className="min-h-dvh" />;
  if (error || !value) return <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>;
  return <ReferenceDataContext.Provider value={value}>{children}</ReferenceDataContext.Provider>;
}
