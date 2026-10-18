import { useState } from 'react';
import { cn } from '@/components/common/cn';
import { useAdminLocale } from '../i18n';

export interface ChartDatum {
  id: string;
  label: string;
  value: number;
  /** Formatted value for labels and tooltips. */
  display: string;
  /** Optional second line in the tooltip. */
  detail?: string;
}

/**
 * Single-series column chart (one hue, so no legend; the card title names it).
 * Hover or focus a column for its exact value; the latest column is labelled directly.
 */
export function ColumnChart({ data, height = 200, ariaLabel }: { data: ChartDatum[]; height?: number; ariaLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const last = data[data.length - 1]?.id;
  return (
    <div role="img" aria-label={ariaLabel} className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height }} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-t border-dashed border-ink-100" />
        ))}
      </div>
      <div className="relative flex items-end gap-1.5 sm:gap-3" style={{ height }}>
        {data.map((d) => {
          const h = d.value > 0 ? Math.max(4, (d.value / max) * (height - 28)) : 0;
          const show = active === d.id || (active === null && d.id === last);
          return (
            <div
              key={d.id}
              tabIndex={0}
              aria-label={`${d.label}: ${d.display}${d.detail ? `, ${d.detail}` : ''}`}
              onMouseEnter={() => setActive(d.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(d.id)}
              onBlur={() => setActive(null)}
              className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none"
            >
              {show && (
                <div className="absolute z-10 whitespace-nowrap rounded-lg bg-ink-950 px-2 py-1 text-center text-xs font-semibold text-white shadow-lift" style={{ bottom: h + 6 }}>
                  <div className="tabular-nums">{d.display}</div>
                  {d.detail && <div className="font-normal text-white/70">{d.detail}</div>}
                </div>
              )}
              <div
                className={cn('w-full max-w-12 rounded-t-[4px] transition-colors', active === d.id ? 'bg-plum-800' : 'bg-plum-500', 'group-focus-visible:ring-2 group-focus-visible:ring-gold-400')}
                style={{ height: h }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-3" aria-hidden="true">
        {data.map((d) => (
          <div key={d.id} className="flex-1 truncate text-center text-[11px] text-ink-500">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked horizontal bars with the value written at the end of each row. */
export function BarList({ data, colorFor, emptyText }: { data: ChartDatum[]; colorFor?: (id: string) => string; emptyText?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-6 text-center text-sm text-ink-500">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.id} title={d.detail ? `${d.display} · ${d.detail}` : d.display}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink-900">{d.label}</span>
            <span className="shrink-0 tabular-nums text-ink-700">
              {d.display}
              {d.detail && <span className="ms-1.5 text-xs text-ink-500">{d.detail}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-sand-100">
            <div className={cn('h-2 rounded-full', colorFor?.(d.id) ?? 'bg-plum-500')} style={{ width: `${Math.max(d.value > 0 ? 2 : 0, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Accessible table view of any chart's data. */
export function ChartTable({ data, labelHeader, valueHeader }: { data: ChartDatum[]; labelHeader: string; valueHeader: string }) {
  const { a } = useAdminLocale();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button type="button" className="text-xs font-semibold text-plum-700 hover:underline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? a('common.hideTable') : a('common.showTable')}
      </button>
      {open && (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-ink-500">
              <th className="py-1 text-start font-semibold">{labelHeader}</th>
              <th className="py-1 text-end font-semibold">{valueHeader}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} className="border-t border-ink-100">
                <td className="py-1.5">{d.label}</td>
                <td className="py-1.5 text-end tabular-nums">
                  {d.display}
                  {d.detail && <span className="ms-2 text-ink-500">{d.detail}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
