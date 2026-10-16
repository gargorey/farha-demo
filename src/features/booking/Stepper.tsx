import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/components/common/cn';
import { BOOKING_STEPS } from './useBookingDraft';

export function Stepper({ current, onSelect }: { current: number; onSelect: (i: number) => void }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('booking.pageTitle')}>
      <p className="mb-3 text-sm font-semibold text-plum-700 sm:hidden">
        {t('booking.stepOf', { current: current + 1, total: BOOKING_STEPS.length })} · {t(`booking.steps.${BOOKING_STEPS[current]}`)}
      </p>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {BOOKING_STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={!done}
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={cn('flex items-center gap-2 rounded-full text-start text-sm font-semibold transition-colors', done && 'hover:text-plum-700')}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
                    active ? 'bg-plum-800 text-white ring-4 ring-plum-100' : done ? 'bg-mint-600 text-white' : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                </span>
                <span className={cn('hidden lg:inline', active ? 'text-ink-900' : 'text-ink-500')}>{t(`booking.steps.${step}`)}</span>
              </button>
              {i < BOOKING_STEPS.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', done ? 'bg-mint-600' : 'bg-ink-100')} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
