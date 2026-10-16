import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'plum' | 'gold' | 'coral' | 'mint' | 'neutral' | 'dark';
const tones: Record<Tone, string> = {
  plum: 'bg-plum-100 text-plum-800',
  gold: 'bg-gold-100 text-gold-600',
  coral: 'bg-coral-100 text-coral-600',
  mint: 'bg-mint-100 text-mint-600',
  neutral: 'bg-ink-100 text-ink-700',
  dark: 'bg-ink-950/75 text-white backdrop-blur',
};

export function Badge({ tone = 'neutral', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
