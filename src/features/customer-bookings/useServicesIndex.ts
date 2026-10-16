import { useMemo } from 'react';
import type { Service } from '@/models';
import { api } from '@/services/api';
import { useAsync } from '@/hooks/useAsync';

/** Loads the catalogue once and indexes it by id (to show service names/images for bookings). */
export function useServicesIndex() {
  const { data } = useAsync(() => api.listServices(), []);
  return useMemo(() => new Map<string, Service>((data?.items ?? []).map((s) => [s.id, s])), [data]);
}
