import type { ReactNode } from 'react';
import { AlertTriangle, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/models';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { cn } from './cn';

export function EmptyState({ title, text, icon, action, className }: { title: string; text?: string; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-3xl border border-dashed border-ink-100 bg-white px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-plum-50 text-plum-600">{icon ?? <SearchX className="size-7" aria-hidden="true" />}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="mt-1.5 max-w-md text-ink-500">{text}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title }: { error?: unknown; onRetry?: () => void; title?: string }) {
  const { t } = useTranslation();
  const isNetwork = error instanceof ApiError && error.code === 'NETWORK_ERROR';
  return (
    <div role="alert" className="flex flex-col items-center rounded-3xl border border-coral-100 bg-coral-100/40 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 size-9 text-coral-600" aria-hidden="true" />
      <h3 className="text-lg font-bold">{title ?? t('error.title')}</h3>
      <p className="mt-1 text-ink-500">{isNetwork ? t('error.network') : t('error.text')}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function LoadingBlock({ label, className }: { label?: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-20 text-ink-500', className)}>
      <Spinner />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}
