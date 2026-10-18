import { Link } from 'react-router-dom';
import { AlertCircle, CalendarClock, CalendarDays, Info, Wallet } from 'lucide-react';
import { StatusBadge } from '@/components/booking/StatusBadge';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { ChevronForward } from '@/components/common/Icons';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import { BOOKING_STATUSES, type BookingStatus } from '@/models';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { BarList, ChartTable, ColumnChart } from '../components/charts';
import { Card, KpiCard, PageHeader } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { AdminBooking } from '../models';
import { compactMoney, monthLabel } from '../utils/helpers';

export const STATUS_BAR: Record<BookingStatus, string> = {
  draft: 'bg-ink-300',
  pending_request: 'bg-gold-500',
  pending_confirmation: 'bg-plum-500',
  confirmed: 'bg-mint-600',
  completed: 'bg-ink-500',
  cancellation_requested: 'bg-coral-500',
  cancelled: 'bg-ink-300',
};

function reasonKey(b: AdminBooking) {
  if (b.status === 'pending_request' || b.status === 'pending_confirmation' || b.status === 'cancellation_requested') return b.status;
  return 'modification';
}

export function BookingRowLink({ b, extra }: { b: AdminBooking; extra?: string }) {
  const { l, date, time } = useAdminLocale();
  const { serviceById } = useCatalog();
  const { cityById } = useReferenceData();
  return (
    <Link to={`/bookings/${b.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-plum-50/60">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {b.customer.fullName} · {l(serviceById(b.selection.serviceId)?.name)}
        </p>
        <p className="truncate text-xs text-ink-500">
          {date(b.event.date, 'medium')} · {time(b.event.startTime)} · {l(cityById(b.event.cityId)?.name)}
          {extra && <> · <span className="font-semibold text-coral-600">{extra}</span></>}
        </p>
      </div>
      <ChevronForward className="size-4 shrink-0 text-ink-300" />
    </Link>
  );
}

export default function OverviewPage() {
  const { a, t, money, num, locale } = useAdminLocale();
  const { user } = useSession();
  const { data, error, loading, reload } = useAsync(() => adminApi.getDashboard(), []);

  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} title={a('common.loadFailed')} />;

  const trend = (now: number, before: number) => (now > before ? 'up' : now < before ? 'down' : 'flat');
  const revenueData = data.revenueByMonth.map((m) => ({
    id: m.month,
    label: monthLabel(m.month, locale),
    value: m.revenue,
    display: money(m.revenue),
    detail: a('common.nBookings', { n: num(m.bookings) }),
  }));
  const statusData = BOOKING_STATUSES.filter((s) => s !== 'draft').map((s) => ({
    id: s,
    label: t(`status.${s}`),
    value: data.statusCounts[s],
    display: num(data.statusCounts[s]),
  }));

  return (
    <>
      <PageHeader title={a('overview.title')} subtitle={user ? a('overview.greeting', { name: user.name }) : undefined} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={a('overview.kpi.bookingsThisMonth')}
          value={num(data.bookingsThisMonth)}
          hint={a('overview.vsLastMonth', { value: num(data.bookingsLastMonth) })}
          trend={trend(data.bookingsThisMonth, data.bookingsLastMonth)}
          icon={<CalendarClock className="size-5" aria-hidden="true" />}
        />
        <KpiCard
          label={a('overview.kpi.revenueThisMonth')}
          value={money(data.revenueThisMonth)}
          hint={a('overview.vsLastMonth', { value: compactMoney(data.revenueLastMonth, locale) })}
          trend={trend(data.revenueThisMonth, data.revenueLastMonth)}
          icon={<Wallet className="size-5" aria-hidden="true" />}
        />
        <Link to="/bookings?status=needs_action" className="rounded-2xl focus-visible:outline-2">
          <KpiCard label={a('overview.kpi.needsAction')} value={num(data.needsAction)} icon={<AlertCircle className="size-5" aria-hidden="true" />} />
        </Link>
        <Link to="/calendar" className="rounded-2xl">
          <KpiCard label={a('overview.kpi.upcoming7')} value={num(data.upcoming7Days)} icon={<CalendarDays className="size-5" aria-hidden="true" />} />
        </Link>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-plum-50 px-4 py-2.5 text-sm text-plum-800">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {a('overview.websiteHint')}
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title={a('overview.revenueTrend')} className="xl:col-span-2">
          <p className="-mt-1 mb-4 text-xs text-ink-500">{a('overview.revenueTrendHint')}</p>
          <ColumnChart data={revenueData} ariaLabel={a('overview.revenueTrend')} />
          <ChartTable data={revenueData} labelHeader={a('common.month')} valueHeader={a('common.revenue')} />
        </Card>
        <Card title={a('overview.statusBreakdown')}>
          <BarList data={statusData} colorFor={(id) => STATUS_BAR[id as BookingStatus]} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          title={a('overview.queue')}
          bodyClassName="p-0"
          actions={
            <Link to="/bookings?status=needs_action" className="text-sm font-semibold text-plum-700 hover:underline">
              {a('common.seeAll')}
            </Link>
          }
        >
          {data.actionQueue.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">{a('overview.queueEmpty')}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.actionQueue.map((b) => (
                <li key={b.id}>
                  <BookingRowLink b={b} extra={a(`overview.reason.${reasonKey(b)}`)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={a('overview.upcoming')} bodyClassName="p-0">
          {data.upcoming.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">{a('overview.upcomingEmpty')}</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.upcoming.map((b) => (
                <li key={b.id} className="flex items-center">
                  <div className="min-w-0 flex-1">
                    <BookingRowLink b={b} />
                  </div>
                  <StatusBadge status={b.status} className="me-5 hidden sm:inline-flex" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
