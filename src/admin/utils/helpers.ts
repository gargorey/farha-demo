import { appEnv } from '@/config/env';
import type { Locale } from '@/models';
import { localeTag } from '@/utils/format';

/** Link to a page of the customer website from the dashboard (served one folder up). */
export function siteUrl(path = '/'): string {
  return appEnv.routerMode === 'hash' ? `../#${path}` : path;
}

/** "2026-10" → "Oct" / "أكتوبر" (with the year when asked). */
export function monthLabel(month: string, locale: Locale, withYear = false): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(localeTag(locale), { month: 'short', ...(withYear ? { year: 'numeric' } : {}), calendar: 'gregory' }).format(new Date(y, m - 1, 1));
}

/** Compact money for chart labels: 12,400 → "12.4K". */
export function compactMoney(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
}

export function percent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

/** Builds a CSV (with BOM so Excel opens Arabic correctly) and downloads it. */
export function downloadCsv(filename: string, rows: (string | number | undefined)[][]): void {
  const esc = (v: string | number | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
