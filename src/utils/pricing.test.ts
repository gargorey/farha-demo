import { describe, expect, it } from 'vitest';
import { services } from '@/services/mock/services-data';
import { cities } from '@/services/mock/reference-data';
import { calculatePricing } from './pricing';

const magician = services.find((s) => s.id === 'svc-magician-sultan')!;
const riyadh = cities.find((c) => c.id === 'riyadh')!;
const makkah = cities.find((c) => c.id === 'makkah')!;
const noVat = { vat: { enabled: false, rate: 0.15, pricesIncludeVat: false }, applyTravelFee: true, discounts: [] };

describe('calculatePricing', () => {
  it('prices a package alone and adds 15% VAT as a separate line', () => {
    const p = calculatePricing({ service: magician, packageId: 'basic', addOns: [], city: riyadh });
    expect(p.subtotal).toBe(1200);
    expect(p.vat).toBe(180);
    expect(p.total).toBe(1380);
    expect(p.lines.map((l) => l.kind)).toEqual(['package', 'vat']);
  });

  it('adds add-ons with quantities, extra hours and the city travel fee', () => {
    const p = calculatePricing(
      { service: magician, packageId: 'plus', addOns: [{ addOnId: 'balloons', quantity: 1 }, { addOnId: 'gifts', quantity: 3 }], extraHours: 1, city: makkah },
      noVat,
    );
    // 1850 + 250 + 3*120 + 450 + 150
    expect(p.total).toBe(3060);
    expect(p.lines.find((l) => l.kind === 'travel')?.amount).toBe(150);
  });

  it('caps quantities and extra hours at the configured maximum and ignores unknown add-ons', () => {
    const p = calculatePricing(
      { service: magician, packageId: 'basic', addOns: [{ addOnId: 'gifts', quantity: 99 }, { addOnId: 'nope', quantity: 1 }], extraHours: 10 },
      noVat,
    );
    expect(p.lines.find((l) => l.kind === 'addon')?.quantity).toBe(10);
    expect(p.lines.find((l) => l.kind === 'extra-hours')?.quantity).toBe(magician.maxExtraHours);
  });

  it('does not invent discounts that are not configured', () => {
    const p = calculatePricing({ service: magician, packageId: 'basic', addOns: [], discountCode: 'FREE50' }, noVat);
    expect(p.discountTotal).toBe(0);
    expect(p.total).toBe(1200);
  });

  it('applies a configured discount before VAT', () => {
    const p = calculatePricing(
      { service: magician, packageId: 'basic', addOns: [], discountCode: 'demo10' },
      { ...noVat, vat: { enabled: true, rate: 0.15, pricesIncludeVat: false }, discounts: [{ code: 'DEMO10', percent: 10 }] },
    );
    expect(p.discountTotal).toBe(120);
    expect(p.total).toBe(1242); // (1200-120)*1.15
  });

  it('throws for an unknown package', () => {
    expect(() => calculatePricing({ service: magician, packageId: 'x', addOns: [] })).toThrow();
  });
});
