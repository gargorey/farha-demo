import type { Locale, LocalizedText } from '@/models';

export const localeTag = (locale: Locale) => (locale === 'ar' ? 'ar-SA' : 'en-SA');

/** Picks the right language from a localized value, falling back to the other language. */
export function tx(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  return text[locale] || text[locale === 'ar' ? 'en' : 'ar'];
}

export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeTag(locale), options).format(value);
}

export function formatDate(iso: string, locale: Locale, style: 'long' | 'medium' | 'short' = 'long'): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const opts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : style === 'medium'
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric' };
  // Gregorian calendar keeps dates unambiguous for providers; locale controls language & digits.
  return new Intl.DateTimeFormat(localeTag(locale), { ...opts, calendar: 'gregory' }).format(date);
}

export function formatDateTime(isoTimestamp: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    calendar: 'gregory',
  }).format(new Date(isoTimestamp));
}

export function formatTime(hhmm: string, locale: Locale): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat(localeTag(locale), { hour: 'numeric', minute: '2-digit' }).format(d);
}

/** Returns a duration like "1 h 30 min" / "ساعة و٣٠ دقيقة". */
export function formatDuration(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const n = (v: number) => formatNumber(v, locale);
  if (locale === 'ar') {
    const hours = h === 0 ? '' : h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : `${n(h)} ساعات`;
    const mins = m === 0 ? '' : `${n(m)} دقيقة`;
    return [hours, mins].filter(Boolean).join(' و');
  }
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

/** Wrap LTR fragments (phone, email, references) so they render correctly inside RTL text. */
export const ltrIsolate = (value: string) => `⁦${value}⁩`;
