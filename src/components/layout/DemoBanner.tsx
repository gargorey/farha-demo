import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { runtimeInfo } from '@/config/business';
import { api } from '@/services/api';

export function DemoBanner() {
  const { t } = useTranslation();
  // Shown for the browser demo and for demo deployments of the backend.
  if (!api.isDemo && !runtimeInfo.serverDemo) return null;
  return (
    <div className="bg-plum-950 text-white/90">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs">
        <FlaskConical className="size-3.5 shrink-0 text-gold-400" aria-hidden="true" />
        <span className="hidden sm:inline">{t('demoBanner.text')}</span>
        <span className="sm:hidden">{t('demoBanner.short')}</span>
      </p>
    </div>
  );
}
