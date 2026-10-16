import { ArrowRight, ChevronRight, type LucideProps } from 'lucide-react';
import { cn } from './cn';

/** "Forward" arrow that points left in RTL and right in LTR. */
export const ArrowForward = ({ className, ...p }: LucideProps) => <ArrowRight className={cn('flip-rtl', className)} aria-hidden="true" {...p} />;
export const ChevronForward = ({ className, ...p }: LucideProps) => <ChevronRight className={cn('flip-rtl', className)} aria-hidden="true" {...p} />;
