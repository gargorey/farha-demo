import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Locale } from '@/models';
import { readJSON, writeJSON } from '@/utils/storage';
import ar from './locales/ar';
import en from './locales/en';

export const SUPPORTED_LOCALES: Locale[] = ['ar', 'en'];
export const DEFAULT_LOCALE: Locale = 'ar';
const LOCALE_KEY = 'farha.locale';

function initialLocale(): Locale {
  const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lang') : null;
  if (fromUrl === 'ar' || fromUrl === 'en') return fromUrl;
  const saved = readJSON<string | null>(LOCALE_KEY, null);
  return saved === 'en' || saved === 'ar' ? saved : DEFAULT_LOCALE;
}

export const directionOf = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr');

/** Keeps <html lang/dir> in sync so the whole layout flips between RTL and LTR. */
function applyDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = directionOf(locale);
}

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLocale(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLocale(i18n.language as Locale);
i18n.on('languageChanged', (lng) => {
  applyDocumentLocale(lng as Locale);
  writeJSON(LOCALE_KEY, lng);
});

export default i18n;
