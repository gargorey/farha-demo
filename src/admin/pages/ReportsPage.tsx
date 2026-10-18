import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { cn } from '@/components/common/cn';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import { addDays, todayISO } from '@/utils/dates';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { BarList, ChartTable, ColumnChart, type ChartDatum } from '../components/charts';
import { Card, KpiCard, PageHeader } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import { downloadCsv, monthLabel, percent } from '../utils/helpers';

type Range = 'last30' | 'last90' | 'last180' | 'next60' | 'year';
const RANGES: Range[] = ['last30', 'last90', 'last180', 'next60', 'year'];

function rangeDates(r: Range, today = todayISO()) {
  switch (r) {
    case 'last30':
      return { from: addDays(today, -30), to: today };
    case 'last90':
      return { from: addDays(today, -90), to: today };
    case 'last180':
      return { from: addDays(today, -182), to: today };
    case 'next60':
      return { from: today, to: addDays(today, 60) };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
  }
}

export default function ReportsPage() {
  const { a, l, money, num, locale, date } = useAdminLocale();
  const { categoryById, serviceById } = useCatalog();
  const { cityById, eventTypeById } = useReferenceData();
  const { can } = useSession();
  const [range, setRange] = useState<Range>('last180');
  const { from, to } = rangeDates(range);
  const { data, error, loading, reload } = useAsync(() => adminApi.getReport({ from, to }), [from, to]);

  const revenueRows = (rows: { id: string; revenue: number; bookings: number }[], label: (id: string) => string): ChartDatum[] =>
    rows.map((r) => ({ id: r.id, label: label(r.id), value: r.revenue, display: money(r.revenue), detail: a('common.nBookings', { n: num(r.bookings) }) }));

  async function exportBookings() {
    const all = await adminApi.listBookings({ from, to, pageSize: 100_000, sort: 'event-asc' });
    downloadCsv(`farha-report-${from}-to-${to}.csv`, [
      ['reference', 'event_date', 'status', 'category', 'service', 'city', 'occasion', 'channel', 'subtotal', 'discount', 'vat', 'total'],
      ...all.items.map((b) => {
        const svc = serviceById(b.selection.serviceId);
        return [b.reference, b.event.date, b.status, svc?.categoryId, svc?.name.en, b.event.cityId, b.event.eventTypeId, b.channel, b.pricing.subtotal, b.pricing.discountTotal, b.pricing.vat, b.pricing.total];
      }),
    ]);
  }

  return (
    <>
      <PageHeader
        title={a('reports.title')}
        subtitle={`${a('reports.subtitle')} ${date(from, 'medium')} – ${date(to, 'medium')}`}
        actions={
          can('reports.view') ? (
            <Button variant="outline" icon={<Download className="size-4" aria-hidden="true" />} onClick={exportBookings}>
              {a('reports.exportBookings')}
            </Button>
          ) : (
            <span className="text-xs text-ink-500">{a('reports.noPermission')}</span>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={a('common.date')}>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            className={cn(
              'h-9 rounded-full border px-4 text-sm font-semibold transition-colors',
              range === r ? 'border-plum-800 bg-plum-800 text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-plum-200',
            )}
          >
            {a(`reports.range.${r}`)}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={reload} title={a('common.loadFailed')} />
      ) : (
        <div className={cn('space-y-6', loading && 'opacity-60')}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={a('reports.kpi.gross')} value={money(data.grossRevenue)} hint={`${a('reports.kpi.net')}: ${money(data.netRevenue)}`} />
            <KpiCard label={a('reports.kpi.commission')} value={money(data.commission)} hint={`${a('reports.kpi.vat')}: ${money(data.vatCollected)}`} />
            <KpiCard label={a('reports.kpi.avg')} value={money(data.averageBookingValue)} hint={`${a('reports.kpi.bookings')}: ${num(data.confirmedBookings)} / ${num(data.bookings)}`} />
            <KpiCard label={a('reports.kpi.cancel')} value={percent(data.cancellationRate, locale)} />
          </div>
          <p className="text-xs text-ink-500">{a('reports.revenueNote')}</p>

          <Card title={a('reports.byMonth')}>
            {(() => {
              const rows = data.byMonth.map((m) => ({ id: m.month, label: monthLabel(m.month, locale), value: m.revenue, display: money(m.revenue), detail: a('common.nBookings', { n: num(m.bookings) }) }));
              return (
                <>
                  <ColumnChart data={rows} ariaLabel={a('reports.byMonth')} />
                  <ChartTable data={rows} labelHeader={a('common.month')} valueHeader={a('common.revenue')} />
                </>
              );
            })()}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={a('reports.byCategory')}>
              <BarList data={revenueRows(data.byCategory, (id) => l(categoryById(id)?.name))} emptyText={a('common.noResults')} />
            </Card>
            <Card title={a('reports.topServices')}>
              <BarList data={revenueRows(data.topServices, (id) => l(serviceById(id)?.name))} emptyText={a('common.noResults')} />
            </Card>
            <Card title={a('reports.byCity')}>
              <BarList data={revenueRows(data.byCity, (id) => l(cityById(id)?.name))} emptyText={a('common.noResults')} />
            </Card>
            <Card title={a('reports.byEventType')}>
              <BarList
                data={[...data.byEventType]
                  .sort((x, y) => y.bookings - x.bookings)
                  .map((r) => ({ id: r.id, label: l(eventTypeById(r.id)?.name), value: r.bookings, display: num(r.bookings), detail: money(r.revenue) }))}
                emptyText={a('common.noResults')}
              />
            </Card>
            <Card title={a('reports.byChannel')}>
              <BarList data={data.byChannel.map((r) => ({ id: r.id, label: a(`bookings.channel.${r.id}`), value: r.bookings, display: num(r.bookings) }))} emptyText={a('common.noResults')} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
