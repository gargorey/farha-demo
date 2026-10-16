import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { cn } from './cn';

export function StarRating({ rating, count, size = 'sm', className }: { rating: number; count?: number; size?: 'sm' | 'md'; className?: string }) {
  const { t } = useTranslation();
  const { num } = useLocale();
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Star className={cn('fill-gold-400 text-gold-400', size === 'sm' ? 'size-4' : 'size-5')} aria-hidden="true" />
      <span className="font-semibold text-ink-900" aria-label={t('service.rating', { rating: num(rating) })}>
        {num(rating)}
      </span>
      {count != null && <span className="text-ink-500">({t('common.reviews', { count })})</span>}
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('size-4', i < Math.round(value) ? 'fill-gold-400 text-gold-400' : 'text-ink-300')} />
      ))}
    </span>
  );
}
