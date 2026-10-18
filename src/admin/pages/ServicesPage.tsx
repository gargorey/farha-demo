import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Input, Select } from '@/components/common/Field';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '../api';
import { Card, PageHeader, table } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';

export default function ServicesPage() {
  const { a, l, money, num } = useAdminLocale();
  const { services, categories, categoryById, providerById } = useCatalog();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const counts = useAsync(() => adminApi.listBookings({ pageSize: 100_000 }), []);

  const bookingsBy = useMemo(() => {
    const m = new Map<string, number>();
    counts.data?.items.forEach((b) => m.set(b.selection.serviceId, (m.get(b.selection.serviceId) ?? 0) + 1));
    return m;
  }, [counts.data]);

  const rows = services.filter((s) => {
    if (cat && s.categoryId !== cat) return false;
    const n = q.trim().toLowerCase();
    return !n || [s.name.ar, s.name.en, providerById(s.providerId)?.name.en, providerById(s.providerId)?.name.ar].join(' ').toLowerCase().includes(n);
  });

  return (
    <>
      <PageHeader title={a('services.title')} subtitle={a('services.subtitle')} />
      <Card bodyClassName="p-0">
        <div className="grid gap-3 border-b border-ink-100 p-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <Input type="search" className="ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a('services.searchPlaceholder')} aria-label={a('common.search')} />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={a('common.category')}>
            <option value="">{`${a('common.category')}: ${a('common.all')}`}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {l(c.name)}
              </option>
            ))}
          </Select>
        </div>
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                {(['name', 'category', 'provider', 'price', 'bookings', 'rating', 'visible'] as const).map((c) => (
                  <th key={c} scope="col" className={table.th}>
                    {a(`services.col.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={table.row}>
                  <td className={table.td}>
                    <Link to={`/services/${s.id}`} className="font-semibold text-plum-700 hover:underline">
                      {l(s.name)}
                    </Link>
                    {s.featured && (
                      <Badge tone="gold" className="ms-2">
                        ★
                      </Badge>
                    )}
                    <div className="text-xs text-ink-500">{num(s.packages.length)} × {a('services.packages')}</div>
                  </td>
                  <td className={table.td}>{l(categoryById(s.categoryId)?.name)}</td>
                  <td className={table.td}>{l(providerById(s.providerId)?.name)}</td>
                  <td className={`${table.td} whitespace-nowrap tabular-nums`}>{money(s.startingPrice)}</td>
                  <td className={`${table.td} tabular-nums`}>{counts.data ? num(bookingsBy.get(s.id) ?? 0) : '…'}</td>
                  <td className={table.td}>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Star className="size-3.5 fill-gold-400 text-gold-400" aria-hidden="true" />
                      {num(s.rating)}
                    </span>
                  </td>
                  <td className={table.td}>{s.active ? <Badge tone="mint">{a('common.active')}</Badge> : <Badge>{a('common.inactive')}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-12 text-center text-ink-500">{a('common.noResults')}</p>}
        </div>
      </Card>
    </>
  );
}
