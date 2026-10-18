import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, MessageSquareWarning, Search } from 'lucide-react';
import { StatusBadge } from '@/components/booking/StatusBadge';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Field';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import { BOOKING_STATUSES } from '@/models';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, PageHeader, Pagination, table } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { AdminBooking, BookingQuery } from '../models';
import { downloadCsv } from '../utils/helpers';

const PAGE_SIZE = 15;
const FILTER_KEYS = ['q', 'status', 'cityId', 'categoryId', 'providerId', 'customerId', 'from', 'to', 'sort'] as const;

export default function BookingsPage() {
  const { a, t, l, money, date, time } = useAdminLocale();
  const { cities, cityById } = useReferenceData();
  const { categories, serviceById, providerById } = useCatalog();
  const { can } = useSession();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');

  const query: BookingQuery = {
    ...Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined])),
    page: Number(params.get('page') ?? 1),
    pageSize: PAGE_SIZE,
  } as BookingQuery;
  const key = params.toString();
  const { data, error, loading, reload } = useAsync(() => adminApi.listBookings(query), [key]);

  // Debounced free-text search.
  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get('q') ?? '') !== search) set('q', search);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function set(k: string, v: string | undefined) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && params.get(k));
  const provider = query.providerId ? providerById(query.providerId) : undefined;

  async function exportCsv() {
    const all = await adminApi.listBookings({ ...query, page: 1, pageSize: 100_000 });
    downloadCsv(`farha-bookings-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['reference', 'status', 'event_date', 'start_time', 'city', 'service', 'package', 'customer', 'phone', 'email', 'attendees', 'subtotal', 'vat', 'total', 'channel', 'created_at'],
      ...all.items.map((b) => [
        b.reference,
        b.status,
        b.event.date,
        b.event.startTime,
        b.event.cityId,
        serviceById(b.selection.serviceId)?.name.en,
        b.selection.packageId,
        b.customer.fullName,
        b.customer.phone,
        b.customer.email,
        b.event.attendees,
        b.pricing.subtotal,
        b.pricing.vat,
        b.pricing.total,
        b.channel,
        b.createdAt,
      ]),
    ]);
  }

  return (
    <>
      <PageHeader
        title={a('bookings.title')}
        subtitle={provider ? `${a('common.provider')}: ${l(provider.name)}` : a('bookings.subtitle')}
        actions={
          (can('reports.view') || can('bookings.manage')) && (
            <Button variant="outline" icon={<Download className="size-4" aria-hidden="true" />} onClick={exportCsv}>
              {a('common.exportCsv')}
            </Button>
          )
        }
      />

      <Card bodyClassName="p-0">
        <div className="grid gap-3 border-b border-ink-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={a('bookings.searchPlaceholder')}
              aria-label={a('common.search')}
              className="ps-9"
            />
          </div>
          <Select aria-label={a('common.status')} value={params.get('status') ?? ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">{`${a('common.status')}: ${a('common.all')}`}</option>
            <option value="needs_action">{a('bookings.needsAction')}</option>
            {BOOKING_STATUSES.filter((s) => s !== 'draft').map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>
          <Select aria-label={a('common.city')} value={params.get('cityId') ?? ''} onChange={(e) => set('cityId', e.target.value)}>
            <option value="">{`${a('common.city')}: ${a('common.all')}`}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {l(c.name)}
              </option>
            ))}
          </Select>
          <Select aria-label={a('common.category')} value={params.get('categoryId') ?? ''} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">{`${a('common.category')}: ${a('common.all')}`}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {l(c.name)}
              </option>
            ))}
          </Select>
          <Select aria-label={a('bookings.sort.label')} value={params.get('sort') ?? 'created-desc'} onChange={(e) => set('sort', e.target.value)}>
            {(['created-desc', 'event-asc', 'event-desc', 'total-desc'] as const).map((s) => (
              <option key={s} value={s}>
                {a(`bookings.sort.${s}`)}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-ink-500 lg:col-span-2">
            <span className="shrink-0">{a('bookings.from')}</span>
            <Input type="date" value={params.get('from') ?? ''} onChange={(e) => set('from', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-500 lg:col-span-2">
            <span className="shrink-0">{a('bookings.to')}</span>
            <Input type="date" value={params.get('to') ?? ''} onChange={(e) => set('to', e.target.value)} />
          </label>
          {hasFilters && (
            <div className="flex items-center lg:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                {a('common.clearFilters')}
              </Button>
            </div>
          )}
        </div>

        {loading && !data ? (
          <LoadingBlock />
        ) : error || !data ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : data.items.length === 0 ? (
          <p className="px-5 py-14 text-center text-ink-500">{a('bookings.empty')}</p>
        ) : (
          <div className={table.wrap} aria-busy={loading}>
            <table className={table.table}>
              <thead>
                <tr>
                  {(['reference', 'event', 'customer', 'service', 'total', 'status'] as const).map((c) => (
                    <th key={c} scope="col" className={table.th}>
                      {a(`bookings.col.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((b: AdminBooking) => (
                  <tr key={b.id} className={table.row}>
                    <td className={table.td}>
                      <Link to={`/bookings/${b.id}`} className="font-semibold text-plum-700 hover:underline">
                        <span className="ltr-value whitespace-nowrap">{b.reference}</span>
                      </Link>
                      <div className="text-xs text-ink-500">
                        {adminApi.isDemo && b.origin === 'website' ? a('bookings.origin.website') : a(`bookings.channel.${b.channel ?? 'website'}`)}
                      </div>
                    </td>
                    <td className={table.td}>
                      <div className="whitespace-nowrap">{date(b.event.date, 'medium')}</div>
                      <div className="text-xs text-ink-500">
                        {time(b.event.startTime)} · {l(cityById(b.event.cityId)?.name)}
                      </div>
                    </td>
                    <td className={table.td}>
                      <div className="font-medium">{b.customer.fullName}</div>
                      <div className="text-xs text-ink-500">
                        <span className="ltr-value">{b.customer.phone}</span>
                      </div>
                    </td>
                    <td className={table.td}>
                      <div className="max-w-56 truncate">{l(serviceById(b.selection.serviceId)?.name)}</div>
                      {b.modificationRequest && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-coral-600">
                          <MessageSquareWarning className="size-3.5" aria-hidden="true" />
                          {a('bookings.changeFlag')}
                        </div>
                      )}
                    </td>
                    <td className={`${table.td} whitespace-nowrap font-semibold tabular-nums`}>{money(b.pricing.total)}</td>
                    <td className={table.td}>
                      <StatusBadge status={b.status} className="whitespace-nowrap" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={query.page ?? 1} pageSize={PAGE_SIZE} total={data.total} onPage={(p) => set('page', String(p))} />}
      </Card>
    </>
  );
}
