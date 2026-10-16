import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Locale, LocalizedText } from '@/models';
import { directionOf } from '@/i18n';
import { formatCurrency, formatDate, formatDuration, formatNumber, formatTime, tx } from '@/utils/format';

/** Locale-aware helpers used across components. */
export function useLocale() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language === 'en' ? 'en' : 'ar') as Locale;
  const dir = directionOf(locale);

  return {
    t,
    locale,
    dir,
    isRtl: dir === 'rtl',
    setLocale: useCallback((l: Locale) => void i18n.changeLanguage(l), [i18n]),
    l: useCallback((text: LocalizedText | undefined) => tx(text, locale), [locale]),
    money: useCallback((amount: number) => formatCurrency(amount, locale), [locale]),
    num: useCallback((n: number) => formatNumber(n, locale), [locale]),
    date: useCallback((iso: string, style?: 'long' | 'medium' | 'short') => formatDate(iso, locale, style), [locale]),
    time: useCallback((hhmm: string) => formatTime(hhmm, locale), [locale]),
    duration: useCallback((m: number) => formatDuration(m, locale), [locale]),
  };
}
