import { describe, expect, it } from 'vitest';
import { categories, cities, eventTypes } from './reference-data';
import { services } from './services-data';

describe('demo catalogue integrity', () => {
  it('has at least 12 services with unique ids and slugs', () => {
    expect(services.length).toBeGreaterThanOrEqual(12);
    expect(new Set(services.map((s) => s.id)).size).toBe(services.length);
    expect(new Set(services.map((s) => s.slug)).size).toBe(services.length);
  });

  it('references only known categories, cities and event types', () => {
    const cat = new Set(categories.map((c) => c.id));
    const city = new Set(cities.map((c) => c.id));
    const ev = new Set(eventTypes.map((e) => e.id));
    for (const s of services) {
      expect(cat.has(s.categoryId)).toBe(true);
      s.cityIds.forEach((c) => expect(city.has(c)).toBe(true));
      s.eventTypeIds.forEach((e) => expect(ev.has(e)).toBe(true));
      s.reviews.forEach((r) => expect(ev.has(r.eventType)).toBe(true));
    }
  });

  it('keeps listing data consistent with packages and has both languages everywhere', () => {
    for (const s of services) {
      expect(s.startingPrice).toBe(Math.min(...s.packages.map((p) => p.price)));
      expect(s.packages.length).toBeGreaterThan(0);
      for (const text of [s.name, s.description, s.shortDescription, ...s.packages.map((p) => p.name), ...s.addOns.map((a) => a.name)]) {
        expect(text.ar.length).toBeGreaterThan(0);
        expect(text.en.length).toBeGreaterThan(0);
      }
    }
  });
});
