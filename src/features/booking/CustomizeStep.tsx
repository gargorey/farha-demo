import { Check, Minus, Plus } from 'lucide-react';
import type { SelectedAddOn, Service } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/components/common/cn';
import { StepActions } from './StepActions';

/** Add-ons update the draft immediately, so the price summary recalculates live. */
export function CustomizeStep({ service, value, onChange, onBack, onNext }: { service: Service; value: SelectedAddOn[]; onChange: (v: SelectedAddOn[]) => void; onBack: () => void; onNext: () => void }) {
  const { t, l, money, num } = useLocale();
  const qty = (id: string) => value.find((a) => a.addOnId === id)?.quantity ?? 0;
  const setQty = (id: string, q: number) => onChange(q <= 0 ? value.filter((a) => a.addOnId !== id) : [...value.filter((a) => a.addOnId !== id), { addOnId: id, quantity: q }]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <h2 className="text-xl font-bold">{t('booking.addOnsTitle')}</h2>
      <p className="mb-6 mt-1 text-sm text-ink-500">{t('booking.addOnsHint')}</p>
      {service.addOns.length === 0 ? (
        <p className="rounded-2xl bg-sand-100 p-5 text-ink-500">{t('booking.noAddOns')}</p>
      ) : (
        <ul className="space-y-3">
          {service.addOns.map((a) => {
            const q = qty(a.id);
            const on = q > 0;
            return (
              <li key={a.id} className={cn('flex flex-wrap items-center gap-4 rounded-2xl border-2 p-4 transition-colors', on ? 'border-plum-700 bg-plum-50/50' : 'border-ink-100 bg-white')}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{l(a.name)}</p>
                  <p className="text-sm text-ink-500">{l(a.description)}</p>
                  <p className="mt-1 text-sm font-bold text-plum-800">
                    {money(a.price)} {a.quantifiable && <span className="text-xs font-normal text-ink-500">{t('service.perUnit')}</span>}
                  </p>
                </div>
                {a.quantifiable ? (
                  <div className="inline-flex items-center rounded-full border border-ink-100 bg-white" role="group" aria-label={`${t('booking.quantity')}: ${l(a.name)}`}>
                    <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-sand-100 disabled:opacity-40" disabled={q <= 0} onClick={() => setQty(a.id, q - 1)} aria-label={t('booking.decrease', { name: l(a.name) })}><Minus className="size-4" aria-hidden="true" /></button>
                    <span className="w-8 text-center font-bold" aria-live="polite">{num(q)}</span>
                    <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-sand-100 disabled:opacity-40" disabled={q >= a.maxQuantity} onClick={() => setQty(a.id, q + 1)} aria-label={t('booking.increase', { name: l(a.name) })}><Plus className="size-4" aria-hidden="true" /></button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setQty(a.id, on ? 0 : 1)}
                    className={cn('inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors', on ? 'bg-plum-800 text-white' : 'bg-plum-100 text-plum-800 hover:bg-plum-200')}
                  >
                    {on ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                    {on ? t('booking.added') : t('booking.add')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <StepActions onBack={onBack} />
    </form>
  );
}
