import { describe, expect, it } from 'vitest';
import { services } from '@/services/mock/services-data';
import { filterAndSortServices } from './catalog-search';

describe('catalogue search and filters', () => {
  it('finds services by Arabic and English keywords', () => {
    expect(filterAndSortServices(services, { q: 'مهرج' }).map((s) => s.id)).toContain('svc-clown-bobo');
    expect(filterAndSortServices(services, { q: 'magician' }).map((s) => s.id)).toContain('svc-magician-sultan');
    // forgiving Arabic normalisation: ة/ه and أ/ا
    expect(filterAndSortServices(services, { q: 'فقاعه' }).length).toBeGreaterThan(0);
  });

  it('combines category, city and price filters', () => {
    const res = filterAndSortServices(services, { categoryIds: ['cat-clowns'], cityId: 'tabuk', maxPrice: 2000 });
    expect(res.map((s) => s.id)).toEqual(['svc-circus-duo']);
  });

  it('sorts by price', () => {
    const res = filterAndSortServices(services, { sort: 'price-asc' });
    for (let i = 1; i < res.length; i++) expect(res[i].startingPrice).toBeGreaterThanOrEqual(res[i - 1].startingPrice);
  });

  it('returns nothing for an unmatched query', () => {
    expect(filterAndSortServices(services, { q: 'zzzz-not-a-service' })).toEqual([]);
  });
});
