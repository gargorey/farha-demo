import type { Service, ServiceQuery } from '@/models';
import { normalizeDigits } from './phone';

/** Normalises Arabic text for forgiving search (alef/yaa/taa marbuta forms, diacritics). */
export function normalizeSearchText(value: string): string {
  return normalizeDigits(value)
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

function searchableText(service: Service, categoryNames: string[]): string {
  return normalizeSearchText(
    [
      service.name.ar,
      service.name.en,
      service.shortDescription.ar,
      service.shortDescription.en,
      service.providerName.ar,
      service.providerName.en,
      ...categoryNames,
      ...service.tags,
    ].join(' '),
  );
}

export function textScore(service: Service, q: string, categoryNames: string[] = []): number {
  const terms = normalizeSearchText(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const hay = searchableText(service, categoryNames);
  const names = normalizeSearchText(`${service.name.ar} ${service.name.en}`);
  let score = 0;
  for (const term of terms) {
    if (!hay.includes(term)) return 0;
    score += names.includes(term) ? 3 : 1;
  }
  return score;
}

export function filterAndSortServices(
  services: Service[],
  query: ServiceQuery,
  categoryNamesById: Record<string, string[]> = {},
): Service[] {
  const scored = services
    .map((s) => ({ s, score: query.q ? textScore(s, query.q, categoryNamesById[s.categoryId]) : 1 }))
    .filter(({ s, score }) => {
      if (score === 0) return false;
      if (query.categoryIds?.length && !query.categoryIds.includes(s.categoryId)) return false;
      if (query.eventTypeId && !s.eventTypeIds.includes(query.eventTypeId)) return false;
      if (query.cityId && !s.cityIds.includes(query.cityId)) return false;
      if (query.minPrice != null && s.startingPrice < query.minPrice) return false;
      if (query.maxPrice != null && s.startingPrice > query.maxPrice) return false;
      if (query.maxDurationMinutes != null && s.durationMinutes > query.maxDurationMinutes) return false;
      if (query.minDurationMinutes != null && Math.max(...s.packages.map((p) => p.durationMinutes)) < query.minDurationMinutes) return false;
      if (query.audience && !s.audience.includes(query.audience) && !s.audience.includes('all')) return false;
      if (query.style && !s.styles.includes(query.style)) return false;
      if (query.attendees && !s.packages.some((p) => p.maxAttendees >= query.attendees!)) return false;
      return true;
    });

  const sort = query.sort ?? 'relevance';
  scored.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.s.startingPrice - b.s.startingPrice;
      case 'price-desc':
        return b.s.startingPrice - a.s.startingPrice;
      case 'popularity':
        return b.s.bookingsCount - a.s.bookingsCount;
      case 'rating':
        return b.s.rating - a.s.rating || b.s.reviewCount - a.s.reviewCount;
      default:
        return b.score - a.score || Number(!!b.s.featured) - Number(!!a.s.featured) || b.s.bookingsCount - a.s.bookingsCount;
    }
  });
  return scored.map(({ s }) => s);
}
