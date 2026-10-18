import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Star } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Field, Input, Select, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, PageHeader, ReadOnlyNote, SectionTitle, table, useToast } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { Provider, ProviderStatus } from '../models';
import { newId, percent } from '../utils/helpers';
import { CheckboxGrid } from './ServiceEditPage';

const TONE: Record<ProviderStatus, 'mint' | 'gold' | 'coral'> = { active: 'mint', pending: 'gold', suspended: 'coral' };

export default function ProvidersPage() {
  const { a, l, num, money, locale } = useAdminLocale();
  const { cities } = useReferenceData();
  const catalog = useCatalog();
  const { can } = useSession();
  const toast = useToast();
  const editable = can('providers.manage');
  const { data, error, loading, reload } = useAsync(() => adminApi.listProviders(), []);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Provider | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!edit) return;
    if (!edit.name.ar.trim() || !edit.name.en.trim() || !edit.phone.trim()) {
      setErr(a('common.saveFailed'));
      return;
    }
    setSaving(true);
    try {
      await adminApi.saveProvider(edit);
      toast(a('common.saved'));
      setEdit(null);
      reload();
      catalog.reload();
    } catch {
      setErr(a('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const rows = (data ?? []).filter((p) => !q.trim() || [p.name.ar, p.name.en, p.contactName, p.email].join(' ').toLowerCase().includes(q.trim().toLowerCase()));
  const pct = (r: number) => percent(r, locale);

  return (
    <>
      <PageHeader
        title={a('providers.title')}
        subtitle={a('providers.subtitle')}
        actions={
          editable && (
            <Button
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                setIsNew(true);
                setErr('');
                setEdit({ id: newId('prv'), name: { ar: '', en: '' }, contactName: '', phone: '', email: '', cityIds: [], status: 'pending', commissionRate: 0.15, joinedAt: new Date().toISOString() });
              }}
            >
              {a('providers.add')}
            </Button>
          )
        }
      />
      {!editable && <ReadOnlyNote />}
      <Card bodyClassName="p-0">
        <div className="border-b border-ink-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden="true" />
            <Input type="search" className="ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a('providers.searchPlaceholder')} aria-label={a('common.search')} />
          </div>
        </div>
        {loading && !data ? (
          <LoadingBlock />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  {(['name', 'contact', 'services', 'bookings', 'revenue', 'commission', 'rating', 'status'] as const).map((c) => (
                    <th key={c} scope="col" className={table.th}>
                      {a(`providers.col.${c}`)}
                    </th>
                  ))}
                  {editable && <th className={table.th}><span className="sr-only">{a('common.actions')}</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className={table.row}>
                    <td className={table.td}>
                      <div className="font-semibold">{l(p.name)}</div>
                      <div className="text-xs text-ink-500">{p.cityIds.length} {a('common.cities')}</div>
                    </td>
                    <td className={table.td}>
                      <div>{p.contactName}</div>
                      <div className="text-xs text-ink-500">
                        <span className="ltr-value">{p.phone}</span>
                      </div>
                    </td>
                    <td className={`${table.td} tabular-nums`}>{num(p.serviceCount)}</td>
                    <td className={`${table.td} tabular-nums`}>
                      <Link to={`/bookings?providerId=${p.id}`} className="text-plum-700 hover:underline">
                        {num(p.bookingCount)}
                      </Link>
                    </td>
                    <td className={`${table.td} whitespace-nowrap tabular-nums`}>{money(p.revenue)}</td>
                    <td className={`${table.td} tabular-nums`}>{pct(p.commissionRate)}</td>
                    <td className={table.td}>
                      {p.rating > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Star className="size-3.5 fill-gold-400 text-gold-400" aria-hidden="true" />
                          {num(p.rating)}
                        </span>
                      )}
                    </td>
                    <td className={table.td}>
                      <Badge tone={TONE[p.status]}>{a(`providers.status.${p.status}`)}</Badge>
                    </td>
                    {editable && (
                      <td className={`${table.td} text-end`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Pencil className="size-4" aria-hidden="true" />}
                          onClick={() => {
                            setIsNew(false);
                            setErr('');
                            const { serviceCount: _s, bookingCount: _b, revenue: _r, rating: _x, ...base } = p;
                            void [_s, _b, _r, _x];
                            setEdit(structuredClone(base));
                          }}
                        >
                          {a('common.edit')}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="px-5 py-12 text-center text-ink-500">{a('common.noResults')}</p>}
          </div>
        )}
      </Card>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={isNew ? a('providers.newTitle') : a('providers.editTitle')}
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              {a('common.cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {a('common.save')}
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid max-h-[65vh] gap-4 overflow-y-auto pe-1">
            {err && <p role="alert" className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">{err}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={a('services.nameAr')} required>
                {(p) => <Input {...p} dir="rtl" value={edit.name.ar} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ar: e.target.value } })} />}
              </Field>
              <Field label={a('services.nameEn')} required>
                {(p) => <Input {...p} dir="ltr" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} />}
              </Field>
              <Field label={a('providers.contactName')}>
                {(p) => <Input {...p} value={edit.contactName} onChange={(e) => setEdit({ ...edit, contactName: e.target.value })} />}
              </Field>
              <Field label={a('providers.phone')} required>
                {(p) => <Input {...p} dir="ltr" type="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />}
              </Field>
              <Field label={a('providers.email')}>
                {(p) => <Input {...p} dir="ltr" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />}
              </Field>
              <Field label={a('providers.commission')}>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(edit.commissionRate * 1000) / 10}
                    onChange={(e) => setEdit({ ...edit, commissionRate: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })}
                  />
                )}
              </Field>
              <Field label={a('common.status')}>
                {(p) => (
                  <Select {...p} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as ProviderStatus })}>
                    {(['active', 'pending', 'suspended'] as const).map((s) => (
                      <option key={s} value={s}>
                        {a(`providers.status.${s}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <div>
              <SectionTitle>{a('common.cities')}</SectionTitle>
              <CheckboxGrid options={cities.map((c) => ({ id: c.id, label: l(c.name) }))} value={edit.cityIds} onChange={(v) => setEdit({ ...edit, cityIds: v })} />
            </div>
            <Field label={a('common.notes')} optionalLabel={a('common.optional')}>
              {(p) => <Textarea {...p} className="min-h-16" value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />}
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
