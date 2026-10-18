import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { StatusBadge } from '@/components/booking/StatusBadge';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Field';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync, type AsyncState } from '@/hooks/useAsync';
import type { Paginated } from '@/models';
import { useReferenceData } from '@/hooks/useReferenceData';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, KpiCard, SectionTitle, Toggle, useToast } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { AdminBooking, CustomerWithStats } from '../models';
import { CustomerTags } from './CustomersPage';

export default function CustomerDetailPage() {
  const { id = '' } = useParams();
  const { a } = useAdminLocale();
  const customer = useAsync(() => adminApi.getCustomer(id), [id]);
  const bookings = useAsync(() => adminApi.listBookings({ customerId: id, pageSize: 500, sort: 'event-desc' }), [id]);
  if (customer.loading && !customer.data) return <LoadingBlock />;
  if (customer.error || !customer.data) return <ErrorState error={customer.error} onRetry={customer.reload} title={a('common.loadFailed')} />;
  return <CustomerView key={JSON.stringify(customer.data)} c={customer.data} bookings={bookings} onSaved={customer.reload} />;
}

function CustomerView({ c, bookings, onSaved }: { c: CustomerWithStats; bookings: AsyncState<Paginated<AdminBooking>>; onSaved: () => void }) {
  const { a, l, money, num, date, time } = useAdminLocale();
  const { cityById } = useReferenceData();
  const { serviceById } = useCatalog();
  const { can } = useSession();
  const toast = useToast();
  const editable = can('customers.manage');
  const [notes, setNotes] = useState(c.notes ?? '');
  const [tags, setTags] = useState(c.tags);
  const [blocked, setBlocked] = useState(c.blocked);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await adminApi.updateCustomer(c.id, { notes, tags, blocked });
      toast(a('common.saved'));
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link to="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 hover:underline">
        <ArrowLeft className="flip-rtl size-4" aria-hidden="true" />
        {a('customers.title')}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{c.fullName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-4" aria-hidden="true" />
            <span className="ltr-value">{c.phone}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mail className="size-4" aria-hidden="true" />
            {c.email}
          </span>
          <span>{l(cityById(c.cityId)?.name)}</span>
          <span>{a('customers.since', { date: date(c.createdAt.slice(0, 10), 'medium') })}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <CustomerTags c={c} />
        </div>
      </div>
      {c.fromWebsite && <p className="mb-5 rounded-xl bg-plum-50 px-4 py-2.5 text-sm text-plum-800">{a('customers.websiteOnly')}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label={a('customers.stats.bookings')} value={num(c.bookingCount)} />
        <KpiCard label={a('customers.stats.spent')} value={money(c.totalSpent)} />
        <KpiCard label={a('customers.stats.last')} value={c.lastBookingAt ? date(c.lastBookingAt.slice(0, 10), 'medium') : '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={a('customers.bookingsTitle')} className="lg:col-span-2" bodyClassName="p-0">
          {bookings.loading && !bookings.data ? (
            <LoadingBlock />
          ) : (
            <ul className="divide-y divide-ink-100">
              {(bookings.data?.items ?? []).map((b) => (
                <li key={b.id}>
                  <Link to={`/bookings/${b.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-plum-50/60">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{l(serviceById(b.selection.serviceId)?.name)}</p>
                      <p className="text-xs text-ink-500">
                        <span className="ltr-value">{b.reference}</span> · {date(b.event.date, 'medium')} · {time(b.event.startTime)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{money(b.pricing.total)}</span>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={a('common.notes')}>
          <fieldset disabled={!editable} className="space-y-5">
            <div>
              <SectionTitle>{a('customers.tags')}</SectionTitle>
              <div className="space-y-3">
                {(['vip', 'corporate'] as const).map((tg) => (
                  <Toggle key={tg} disabled={!editable} checked={tags.includes(tg)} onChange={(on) => setTags(on ? [...tags, tg] : tags.filter((x) => x !== tg))} label={a(`customers.tag.${tg}`)} />
                ))}
                <Toggle disabled={!editable} checked={blocked} onChange={setBlocked} label={a('customers.blocked')} description={a('customers.blockHint')} />
              </div>
            </div>
            <div>
              <SectionTitle>{a('customers.notes')}</SectionTitle>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label={a('customers.notes')} />
            </div>
            {editable && (
              <Button onClick={save} loading={saving} className="w-full">
                {a('common.save')}
              </Button>
            )}
          </fieldset>
        </Card>
      </div>
    </>
  );
}
