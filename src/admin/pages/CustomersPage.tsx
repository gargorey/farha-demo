import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Input, Select } from '@/components/common/Field';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import { adminApi } from '../api';
import { Card, PageHeader, Pagination, table } from '../components/ui';
import { useAdminLocale } from '../i18n';
import type { CustomerWithStats } from '../models';

const PAGE_SIZE = 15;

export function CustomerTags({ c }: { c: CustomerWithStats }) {
  const { a } = useAdminLocale();
  return (
    <>
      {c.blocked && <Badge tone="coral">{a('customers.blocked')}</Badge>}
      {c.tags.map((tag) => (
        <Badge key={tag} tone={tag === 'vip' ? 'gold' : 'plum'}>
          {a(`customers.tag.${tag}`, { defaultValue: tag })}
        </Badge>
      ))}
      {c.fromWebsite && <Badge tone="plum">{a('customers.tag.website')}</Badge>}
    </>
  );
}

export default function CustomersPage() {
  const { a, l, money, num, date } = useAdminLocale();
  const { cityById } = useReferenceData();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const tag = params.get('tag') ?? '';
  const page = Number(params.get('page') ?? 1);
  const key = params.toString();
  const { data, error, loading, reload } = useAsync(() => adminApi.listCustomers({ q: params.get('q') ?? undefined, tag: tag || undefined, page, pageSize: PAGE_SIZE }), [key]);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => {
    const id = setTimeout(() => (params.get('q') ?? '') !== q && set('q', q), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <PageHeader title={a('customers.title')} subtitle={a('customers.subtitle')} />
      <Card bodyClassName="p-0">
        <div className="grid gap-3 border-b border-ink-100 p-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <Input type="search" className="ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a('customers.searchPlaceholder')} aria-label={a('common.search')} />
          </div>
          <Select value={tag} onChange={(e) => set('tag', e.target.value)} aria-label={a('customers.tags')}>
            <option value="">{`${a('customers.tags')}: ${a('common.all')}`}</option>
            {(['vip', 'corporate', 'website'] as const).map((x) => (
              <option key={x} value={x}>
                {a(`customers.tag.${x}`)}
              </option>
            ))}
          </Select>
        </div>
        {loading && !data ? (
          <LoadingBlock />
        ) : error || !data ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : data.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-ink-500">{a('common.noResults')}</p>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  {(['name', 'contact', 'city', 'bookings', 'spent', 'last'] as const).map((c) => (
                    <th key={c} scope="col" className={table.th}>
                      {a(`customers.col.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className={table.row}>
                    <td className={table.td}>
                      <Link to={`/customers/${c.id}`} className="font-semibold text-plum-700 hover:underline">
                        {c.fullName}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <CustomerTags c={c} />
                      </div>
                    </td>
                    <td className={table.td}>
                      <div>
                        <span className="ltr-value">{c.phone}</span>
                      </div>
                      <div className="text-xs text-ink-500">{c.email}</div>
                    </td>
                    <td className={table.td}>{l(cityById(c.cityId)?.name)}</td>
                    <td className={`${table.td} tabular-nums`}>{num(c.bookingCount)}</td>
                    <td className={`${table.td} whitespace-nowrap tabular-nums`}>{money(c.totalSpent)}</td>
                    <td className={`${table.td} whitespace-nowrap`}>{c.lastBookingAt ? date(c.lastBookingAt.slice(0, 10), 'medium') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={(p) => set('page', String(p))} />}
      </Card>
    </>
  );
}
