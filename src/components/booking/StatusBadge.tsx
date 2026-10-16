import { CheckCircle2, CircleDashed, Clock, FileEdit, Hourglass, XCircle, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BookingStatus } from '@/models';
import { cn } from '../common/cn';

const styles: Record<BookingStatus, { cls: string; Icon: typeof Clock }> = {
  draft: { cls: 'bg-ink-100 text-ink-700', Icon: FileEdit },
  pending_request: { cls: 'bg-gold-100 text-gold-600', Icon: Clock },
  pending_confirmation: { cls: 'bg-plum-100 text-plum-700', Icon: Hourglass },
  confirmed: { cls: 'bg-mint-100 text-mint-600', Icon: CheckCircle2 },
  completed: { cls: 'bg-ink-100 text-ink-700', Icon: CheckCircle2 },
  cancellation_requested: { cls: 'bg-coral-100 text-coral-600', Icon: CircleDashed },
  cancelled: { cls: 'bg-ink-100 text-ink-500', Icon: Ban },
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { t } = useTranslation();
  const { cls, Icon } = styles[status] ?? { cls: '', Icon: XCircle };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', cls, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}
