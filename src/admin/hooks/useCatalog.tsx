import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '../api';
import type { AdminCategory, AdminService, Provider } from '../models';

interface Catalog {
  services: AdminService[];
  categories: AdminCategory[];
  providers: Provider[];
  serviceById: (id: string) => AdminService | undefined;
  categoryById: (id: string) => AdminCategory | undefined;
  providerById: (id: string) => Provider | undefined;
  reload: () => void;
}

const CatalogContext = createContext<Catalog | null>(null);

/** Admin catalogue (services, categories, providers) loaded once and shared by every page. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([adminApi.listServices(), adminApi.listCategories(), adminApi.listProviders()]),
    [],
  );
  const value = useMemo<Catalog | null>(() => {
    if (!data) return null;
    const [services, categories, providers] = data;
    return {
      services,
      categories,
      providers,
      serviceById: (id) => services.find((s) => s.id === id),
      categoryById: (id) => categories.find((c) => c.id === id),
      providerById: (id) => providers.find((p) => p.id === id),
      reload,
    };
  }, [data, reload]);
  if (loading && !value) return <LoadingBlock className="min-h-dvh" />;
  if (error || !value) return <div className="p-6"><ErrorState error={error} onRetry={reload} /></div>;
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Catalog {
  const v = useContext(CatalogContext);
  if (!v) throw new Error('useCatalog outside CatalogProvider');
  return v;
}
