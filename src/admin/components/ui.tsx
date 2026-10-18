import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Lock, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { cn } from '@/components/common/cn';
import { useAdminLocale } from '../i18n';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClassName }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-ink-100 bg-white shadow-soft', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-3.5">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, hint, trend, icon }: { label: string; value: string; hint?: string; trend?: 'up' | 'down' | 'flat'; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-plum-50 text-plum-600">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink-950 tabular-nums">{value}</p>
      {hint && (
        <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
          {trend === 'up' && <TrendingUp className="size-3.5 text-mint-600" aria-hidden="true" />}
          {trend === 'down' && <TrendingDown className="size-3.5 text-coral-600" aria-hidden="true" />}
          {hint}
        </p>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; description?: string }) {
  return (
    <label className={cn('flex items-start gap-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-plum-700' : 'bg-ink-300')}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'start-[1.375rem]' : 'start-0.5')} />
      </button>
      <span>
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  );
}

export function ReadOnlyNote() {
  const { a } = useAdminLocale();
  return (
    <p className="mb-4 flex items-center gap-2 rounded-xl bg-sand-100 px-4 py-2.5 text-sm text-ink-700">
      <Lock className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
      {a('common.readOnly')}
    </p>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { a, num } = useAdminLocale();
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-sm text-ink-500" aria-label="pagination">
      <span>{a('common.pageInfo', { from: num(from), to: num(to), total: num(total) })}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} icon={<ChevronLeft className="flip-rtl size-4" aria-hidden="true" />}>
          {a('common.prev')}
        </Button>
        <Button size="sm" variant="outline" disabled={to >= total} onClick={() => onPage(page + 1)}>
          {a('common.next')}
          <ChevronRight className="flip-rtl size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/** Table styles shared by every list page. Wide tables scroll sideways on phones. */
export const table = {
  wrap: 'overflow-x-auto',
  table: 'w-full min-w-[720px] text-sm',
  th: 'whitespace-nowrap bg-sand-50 px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-ink-500',
  td: 'border-t border-ink-100 px-4 py-3 align-middle',
  row: 'transition-colors hover:bg-plum-50/50',
};

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  tone = 'primary',
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  text?: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { a } = useAdminLocale();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {a('common.cancel')}
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {text && <p className="text-ink-700">{text}</p>}
      {children}
    </Modal>
  );
}

/* ---------- Toasts ---------- */

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message }]);
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((x) => (
          <div key={x.id} className="flex animate-pop items-center gap-2 rounded-full bg-ink-950 px-4 py-2.5 text-sm font-medium text-white shadow-lift">
            <CheckCircle2 className="size-4 text-mint-100" aria-hidden="true" />
            {x.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">{children}</h3>;
}
