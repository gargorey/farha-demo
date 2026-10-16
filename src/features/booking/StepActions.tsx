import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ArrowForward } from '@/components/common/Icons';

export function StepActions({ onBack, nextLabel, nextType = 'submit', onNext, loading, disabled, extra }: { onBack?: () => void; nextLabel?: string; nextType?: 'submit' | 'button'; onNext?: () => void; loading?: boolean; disabled?: boolean; extra?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          <ArrowForward className="size-4 rotate-180" />
          {t('common.back')}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        {extra}
        <Button type={nextType} onClick={onNext} variant="primary" size="lg" loading={loading} disabled={disabled}>
          {nextLabel ?? t('common.next')}
          {!loading && <ArrowForward className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
