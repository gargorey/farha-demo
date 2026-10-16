import type { ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import { cn } from './cn';

/** Clearly marks demo-only/simulated content. */
export function DemoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-100/60 px-3.5 py-2.5 text-sm text-ink-700', className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
