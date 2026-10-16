import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

/** Uses native <details> so it works without JS state and is keyboard accessible. */
export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  return (
    <div className={cn('divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white', className)}>
      {items.map((item) => (
        <details key={item.id} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink-900 hover:bg-sand-50 [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown className="size-5 shrink-0 text-ink-500 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="px-5 pb-5 text-ink-700">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
