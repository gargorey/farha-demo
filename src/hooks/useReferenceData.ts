import { createContext, useContext } from 'react';
import type { City, EventType, ServiceCategory } from '@/models';

export interface ReferenceData {
  categories: ServiceCategory[];
  eventTypes: EventType[];
  cities: City[];
  categoryById: (id: string) => ServiceCategory | undefined;
  eventTypeById: (id: string) => EventType | undefined;
  cityById: (id: string) => City | undefined;
}

export const ReferenceDataContext = createContext<ReferenceData | null>(null);

export function useReferenceData(): ReferenceData {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) throw new Error('useReferenceData must be used inside ReferenceDataProvider');
  return ctx;
}
