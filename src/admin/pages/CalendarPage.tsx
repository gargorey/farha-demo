import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/booking/StatusBadge';
import { Button } from '@/components/common/Button';
import { cn } from '@/components/common/cn';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { BookingStatus } from '@/models';
import { addDays, parseISODate, toISODate, todayISO } from '@/utils/dates';
import { localeTag } from '@/utils/format';
import { adminApi } from '../api';
import { Card, PageHeader } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { AdminBooking } from '../models';
import { monthLabel } from '../utils/helpers';

const SHOWN: BookingStatus[] = ['pending_request', 'pending_confirmation', 'confirmed', 'cancellation_requested', 'completed'];
const DOT: Partial<Record<BookingStatus, string>> = {
  pending_request: 'bg-gold-500',
  pending_confirmation: 'bg-gold-500',
  confirmed: 'bg-mint-600',
  completed: 'bg-ink-300',
  cancellation_requested: 'bg-coral-500',
};

export default function CalendarPage() {
  const { a, l, num, date, time, locale } = useAdminLocale();
  const { cityById } = useReferenceData();
  const { serviceById } = useCatalog();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);

  const first = `${month}-01`;
  const gridStart = addDays(first, -parseISODate(first).getDay()); // weeks start on Sunday in KSA
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const from = days[0];
  const to = days[41];

  const { data, error, loading, reload } = useAsync(() => adminApi.listBookings({ from, to, pageSize: 2000, sort: 'event-asc' }), [from, to]);
  const byDay = useMemo(() => {
    const map = new Map<string, AdminBooking[]>();
    for (const b of data?.items ?? []) {
      if (!SHOWN.includes(b.status)) continue;
      map.set(b.event.date, [...(map.get(b.event.date) ?? []), b]);
    }
    return map;
  }, [data]);

  const shift = (delta: number) => {
    const d = parseISODate(first);
    d.setMonth(d.getMonth() + delta);
    setMonth(toISODate(d).slice(0, 7));
  };
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(localeTag(locale), { weekday: 'short' }).format(parseISODate(addDays(gridStart, i))),
  );
  const dayEvents = byDay.get(selected) ?? [];

  return (
    <>
      <PageHeader title={a('calendar.title')} subtitle={a('calendar.subtitle')} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={monthLabel(month, locale, true)}
          actions={
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => shift(-1)} aria-label={a('calendar.prevMonth')} icon={<ChevronLeft className="flip-rtl size-4" aria-hidden="true" />} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMonth(today.slice(0, 7));
                  setSelected(today);
                }}
              >
                {a('calendar.today')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => shift(1)} aria-label={a('calendar.nextMonth')} icon={<ChevronRight className="flip-rtl size-4" aria-hidden="true" />} />
            </div>
          }
        >
          {error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-500" aria-hidden="true">
                {weekdays.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className={cn('grid grid-cols-7 gap-1', loading && 'opacity-60')} role="grid">
                {days.map((d) => {
                  const events = byDay.get(d) ?? [];
                  const inMonth = d.startsWith(month);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelected(d)}
                      aria-pressed={selected === d}
                      aria-label={`${date(d)}: ${num(events.length)}`}
                      className={cn(
                        'flex min-h-16 flex-col rounded-xl border p-1.5 text-start transition-colors sm:min-h-20',
                        selected === d ? 'border-plum-500 bg-plum-50' : 'border-ink-100 hover:bg-sand-50',
                        !inMonth && 'opacity-40',
                      )}
                    >
                      <span className={cn('grid size-6 place-items-center rounded-full text-xs font-semibold', d === today && 'bg-plum-800 text-white')}>
                        {num(parseISODate(d).getDate())}
                      </span>
                      <span className="mt-auto flex flex-wrap gap-0.5">
                        {events.slice(0, 6).map((b) => (
                          <span key={b.id} className={cn('size-2 rounded-full', DOT[b.status])} />
                        ))}
                      </span>
                      {events.length > 6 && <span className="text-[10px] text-ink-500">{a('calendar.more', { num: num(events.length - 6) })}</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-ink-500">{a('calendar.legend')}</p>
            </>
          )}
        </Card>

        <Card title={a('calendar.dayTitle', { date: date(selected) })} bodyClassName="p-0">
          {loading && !data ? (
            <LoadingBlock />
          ) : dayEvents.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">{a('calendar.noEvents')}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {dayEvents
                .sort((x, y) => x.event.startTime.localeCompare(y.event.startTime))
                .map((b) => (
                  <li key={b.id}>
                    <Link to={`/bookings/${b.id}`} className="block px-5 py-3 hover:bg-plum-50/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold tabular-nums">{time(b.event.startTime)}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="mt-1 text-sm font-medium">{l(serviceById(b.selection.serviceId)?.name)}</p>
                      <p className="text-xs text-ink-500">
                        {b.customer.fullName} · {l(cityById(b.event.cityId)?.name)} · {b.event.venue}
                      </p>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
