import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/StateViews';
import { isChunkLoadError } from '@/utils/lazy-with-reload';

/** Friendly error screen for route errors, instead of React Router's default developer page. */
export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  const stale = isChunkLoadError(error);

  useEffect(() => {
    console.error(error);
  }, [error]);

  if (stale) {
    return (
      <div role="alert" className="mx-auto max-w-xl px-6 py-20">
        <div className="flex flex-col items-center rounded-3xl border border-plum-100 bg-plum-50 px-6 py-12 text-center">
          <RefreshCw className="mb-3 size-9 text-plum-600" aria-hidden="true" />
          <h3 className="text-lg font-bold">{t('error.updateTitle')}</h3>
          <p className="mt-1 text-ink-500">{t('error.updateText')}</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            {t('error.reload')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <ErrorState error={error} onRetry={() => window.location.reload()} />
    </div>
  );
}
