import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useLocale } from '@/hooks/useLocale';
import { formatDateTime } from '@/utils/format';
import ar from './ar';
import en from './en';

// The dashboard reuses the website's i18n setup (language, RTL switching, status
// and history labels) and adds its own texts under the "admin" key.
i18n.addResourceBundle('ar', 'translation', { admin: ar }, true, true);
i18n.addResourceBundle('en', 'translation', { admin: en }, true, true);

/** Locale helpers plus `a()` for admin texts (keys relative to "admin."). */
export function useAdminLocale() {
  const base = useLocale();
  const { t } = useTranslation(undefined, { keyPrefix: 'admin' });
  const { locale } = base;
  return {
    ...base,
    a: t,
    dateTime: useCallback((iso: string) => formatDateTime(iso, locale), [locale]),
  };
}

export default i18n;
