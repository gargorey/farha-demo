import { useTranslation } from 'react-i18next';
import type { PriceLine, PricingBreakdown, Service } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { cn } from '../common/cn';

/** Renders a PricingBreakdown produced by utils/pricing — never computes prices itself. */
export function PriceSummary({ pricing, service, className, compact }: { pricing: PricingBreakdown; service: Service; className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const { l, money, num } = useLocale();
  const { cityById } = useReferenceData();

  const label = (line: PriceLine) => {
    const p = line.labelParams ?? {};
    switch (line.kind) {
      case 'package':
        return t('pricing.package', { name: l(service.packages.find((x) => x.id === p.id)?.name) });
      case 'addon':
        return l(service.addOns.find((x) => x.id === p.id)?.name);
      case 'travel':
        return t('pricing.travel', { city: l(cityById(String(p.cityId))?.name) });
      case 'vat':
        return t('pricing.vat', { rate: num(Number(p.rate)) });
      default:
        return t(line.labelKey, p);
    }
  };

  return (
    <div className={cn('text-sm', className)}>
      <dl className="space-y-2.5">
        {pricing.lines
          .filter((line) => line.kind !== 'vat')
          .map((line, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <dt className="text-ink-700">
                {label(line)}
                {line.quantity && line.quantity > 1 && line.unitPrice != null && (
                  <span className="ms-1 text-xs text-ink-500">({money(line.unitPrice)} {t('pricing.qty', { qty: num(line.quantity) })})</span>
                )}
              </dt>
              <dd className={cn('shrink-0 font-semibold tabular-nums', line.amount < 0 && 'text-mint-600')}>{money(line.amount)}</dd>
            </div>
          ))}
      </dl>
      <div className="my-3 border-t border-dashed border-ink-100" />
      <dl className="space-y-2.5">
        {!compact && (
          <div className="flex justify-between gap-4 text-ink-700">
            <dt>{t('pricing.subtotal')}</dt>
            <dd className="font-semibold tabular-nums">{money(pricing.subtotal - pricing.discountTotal)}</dd>
          </div>
        )}
        {pricing.lines
          .filter((line) => line.kind === 'vat')
          .map((line, i) => (
            <div key={i} className="flex justify-between gap-4 text-ink-700">
              <dt>{label(line)}</dt>
              <dd className="font-semibold tabular-nums">{money(line.amount)}</dd>
            </div>
          ))}
        <div className="flex items-baseline justify-between gap-4 pt-1">
          <dt className="font-bold text-ink-900">{pricing.isEstimate ? t('pricing.estimated') : t('pricing.total')}</dt>
          <dd className="text-2xl font-extrabold text-plum-800 tabular-nums">{money(pricing.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
