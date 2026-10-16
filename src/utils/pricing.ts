import { businessConfig } from '@/config/business';
import type { City, PriceLine, PricingBreakdown, SelectedAddOn, Service } from '@/models';

export interface PricingInput {
  service: Service;
  packageId: string;
  addOns: SelectedAddOn[];
  extraHours?: number;
  city?: City;
  discountCode?: string;
}

export interface PricingConfig {
  vat: { enabled: boolean; rate: number; pricesIncludeVat: boolean };
  applyTravelFee: boolean;
  discounts: readonly { code: string; percent: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Single source of truth for price calculation in the frontend.
 * The backend (Project 2) must recompute and is authoritative; the
 * frontend result is shown as an estimate until confirmed.
 */
export function calculatePricing(input: PricingInput, config: PricingConfig = businessConfig.pricing): PricingBreakdown {
  const { service, packageId, addOns, extraHours = 0, city, discountCode } = input;
  const pkg = service.packages.find((p) => p.id === packageId);
  if (!pkg) throw new Error(`Unknown package ${packageId} for ${service.id}`);

  const lines: PriceLine[] = [
    { kind: 'package', labelKey: 'pricing.package', labelParams: { id: pkg.id }, amount: pkg.price },
  ];

  for (const sel of addOns) {
    const addOn = service.addOns.find((a) => a.id === sel.addOnId);
    if (!addOn || sel.quantity <= 0) continue;
    const quantity = addOn.quantifiable ? Math.min(sel.quantity, addOn.maxQuantity) : 1;
    lines.push({
      kind: 'addon',
      labelKey: 'pricing.addon',
      labelParams: { id: addOn.id },
      quantity,
      unitPrice: addOn.price,
      amount: addOn.price * quantity,
    });
  }

  const hours = Math.max(0, Math.min(extraHours, service.maxExtraHours));
  if (hours > 0 && service.extraHourPrice) {
    lines.push({
      kind: 'extra-hours',
      labelKey: 'pricing.extraHours',
      quantity: hours,
      unitPrice: service.extraHourPrice,
      amount: service.extraHourPrice * hours,
    });
  }

  if (config.applyTravelFee && city && city.travelFee > 0) {
    lines.push({ kind: 'travel', labelKey: 'pricing.travel', labelParams: { cityId: city.id }, amount: city.travelFee });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);

  let discountTotal = 0;
  const discount = discountCode
    ? config.discounts.find((d) => d.code.toUpperCase() === discountCode.trim().toUpperCase())
    : undefined;
  if (discount) {
    discountTotal = round2((subtotal * discount.percent) / 100);
    lines.push({ kind: 'discount', labelKey: 'pricing.discount', labelParams: { code: discount.code }, amount: -discountTotal });
  }

  const taxable = subtotal - discountTotal;
  let vat = 0;
  if (config.vat.enabled) {
    vat = config.vat.pricesIncludeVat
      ? round2(taxable - taxable / (1 + config.vat.rate))
      : round2(taxable * config.vat.rate);
    if (!config.vat.pricesIncludeVat) {
      lines.push({ kind: 'vat', labelKey: 'pricing.vat', labelParams: { rate: config.vat.rate * 100 }, amount: vat });
    }
  }

  const total = round2(config.vat.enabled && !config.vat.pricesIncludeVat ? taxable + vat : taxable);

  return {
    currency: 'SAR',
    lines,
    subtotal: round2(subtotal),
    discountTotal,
    vat,
    vatRate: config.vat.enabled ? config.vat.rate : 0,
    total,
    isEstimate: true,
  };
}
