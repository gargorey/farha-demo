import { useState } from 'react';
import { Check, Clock, Users } from 'lucide-react';
import type { Service } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { Badge } from '@/components/common/Badge';
import { cn } from '@/components/common/cn';
import { StepActions } from './StepActions';

export function PackageStep({ service, value, onNext }: { service: Service; value: string; onNext: (packageId: string) => void }) {
  const { t, l, money, duration } = useLocale();
  const [selected, setSelected] = useState(value);
  const [error, setError] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return setError(true);
        onNext(selected);
      }}
      noValidate
    >
      <fieldset>
        <legend className="mb-1 text-xl font-bold">{t('booking.choosePackage')}</legend>
        {error && <p role="alert" className="mb-2 text-sm font-medium text-coral-600">{t('validation.selectPackage')}</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {service.packages.map((p) => {
            const checked = selected === p.id;
            return (
              <label
                key={p.id}
                className={cn(
                  'relative flex cursor-pointer flex-col rounded-2xl border-2 p-5 transition-all',
                  checked ? 'border-plum-700 bg-plum-50/60 shadow-soft' : 'border-ink-100 bg-white hover:border-plum-200',
                )}
              >
                <input type="radio" name="package" value={p.id} checked={checked} onChange={() => { setSelected(p.id); setError(false); }} className="sr-only" />
                {p.popular && <Badge className="absolute -top-2.5 start-4 bg-plum-800 text-white">{t('common.popular')}</Badge>}
                <div className="flex items-start justify-between gap-3">
                  <span className="text-lg font-bold">{l(p.name)}</span>
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2', checked ? 'border-plum-700 bg-plum-700 text-white' : 'border-ink-300')} aria-hidden="true">
                    {checked && <Check className="size-3.5" />}
                  </span>
                </div>
                <span className="mt-1 text-2xl font-extrabold text-plum-800">{money(p.price)}</span>
                <span className="mt-1 text-sm text-ink-500">{l(p.description)}</span>
                <span className="mt-3 flex flex-wrap gap-x-4 text-xs font-medium text-ink-500">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{duration(p.durationMinutes)}</span>
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{t('service.maxAttendees', { count: p.maxAttendees })}</span>
                </span>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.includes.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-mint-600" aria-hidden="true" />{l(inc)}</li>
                  ))}
                </ul>
              </label>
            );
          })}
        </div>
      </fieldset>
      <StepActions />
    </form>
  );
}
