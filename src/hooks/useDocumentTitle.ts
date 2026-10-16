import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useDocumentTitle(title?: string) {
  const { t } = useTranslation();
  useEffect(() => {
    const brand = t('common.brand');
    document.title = title ? `${title} | ${brand}` : `${brand} | ${t('common.tagline')}`;
  }, [title, t]);
}
