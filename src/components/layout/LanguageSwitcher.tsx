import { Languages } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '../common/cn';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, locale, setLocale } = useLocale();
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t('nav.switchLabel')}
      lang={next}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3.5 text-sm font-semibold text-ink-900 transition-colors hover:border-plum-200 hover:bg-plum-50',
        className,
      )}
    >
      <Languages className="size-4 text-plum-600" aria-hidden="true" />
      {t('nav.switchTo')}
    </button>
  );
}
