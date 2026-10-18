import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Field, Input, Select, Textarea } from '@/components/common/Field';
import { cn } from '@/components/common/cn';
import { ErrorState } from '@/components/common/StateViews';
import { useReferenceData } from '@/hooks/useReferenceData';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, ReadOnlyNote, SectionTitle, Toggle, useToast } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { AdminService } from '../models';

export function CheckboxGrid({ options, value, onChange, disabled }: { options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <label key={o.id} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-sm', on ? 'border-plum-300 bg-plum-50' : 'border-ink-100', disabled ? 'opacity-60' : 'cursor-pointer')}>
            <input type="checkbox" className="accent-plum-700" checked={on} disabled={disabled} onChange={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

const numIn = (v: string) => (v === '' ? 0 : Number(v));

export default function ServiceEditPage() {
  const { id = '' } = useParams();
  const { serviceById } = useCatalog();
  const { a } = useAdminLocale();
  const service = serviceById(id);
  if (!service) return <ErrorState title={a('common.loadFailed')} />;
  return <ServiceForm key={service.id + service.updatedAt} initial={service} />;
}

function ServiceForm({ initial }: { initial: AdminService }) {
  const { a, l, date } = useAdminLocale();
  const { cities, eventTypes } = useReferenceData();
  const { categories, providers, reload } = useCatalog();
  const { can } = useSession();
  const toast = useToast();
  const editable = can('catalog.manage');
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const patch = (p: Partial<AdminService>) => setS((x) => ({ ...x, ...p }));
  const setPkg = (i: number, p: Partial<AdminService['packages'][number]>) => patch({ packages: s.packages.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const setAddOn = (i: number, p: Partial<AdminService['addOns'][number]>) => patch({ addOns: s.addOns.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  async function save() {
    const bad = s.packages.some((p) => !(p.price > 0) || !(p.durationMinutes > 0) || !(p.maxAttendees > 0)) || s.addOns.some((x) => !(x.price >= 0));
    if (bad || !s.name.ar.trim() || !s.name.en.trim()) {
      setErr(bad ? a('services.priceInvalid') : a('common.saveFailed'));
      return;
    }
    setErr('');
    setSaving(true);
    try {
      await adminApi.updateService(s.id, s);
      toast(a('common.saved'));
      reload();
    } catch {
      setErr(a('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link to="/services" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-plum-700 hover:underline">
        <ArrowLeft className="flip-rtl size-4" aria-hidden="true" />
        {a('services.title')}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{l(initial.name)}</h1>
          <p className="mt-1 text-sm text-ink-500">{a('services.updated', { date: date(initial.updatedAt.slice(0, 10), 'medium') })}</p>
        </div>
        {editable && (
          <Button onClick={save} loading={saving}>
            {a('common.save')}
          </Button>
        )}
      </div>

      {!editable && <ReadOnlyNote />}
      <p className="mb-5 flex items-start gap-2 rounded-xl bg-plum-50 px-4 py-2.5 text-sm text-plum-800">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {a('services.demoSync')}
      </p>
      {err && (
        <p role="alert" className="mb-5 rounded-xl bg-coral-100 px-4 py-2.5 text-sm font-medium text-coral-600">
          {err}
        </p>
      )}

      <fieldset disabled={!editable} className="space-y-6">
        <Card title={a('services.basics')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={a('services.nameAr')} required>
              {(p) => <Input {...p} dir="rtl" value={s.name.ar} onChange={(e) => patch({ name: { ...s.name, ar: e.target.value } })} />}
            </Field>
            <Field label={a('services.nameEn')} required>
              {(p) => <Input {...p} dir="ltr" value={s.name.en} onChange={(e) => patch({ name: { ...s.name, en: e.target.value } })} />}
            </Field>
            <Field label={a('services.shortAr')}>
              {(p) => <Textarea {...p} dir="rtl" className="min-h-20" value={s.shortDescription.ar} onChange={(e) => patch({ shortDescription: { ...s.shortDescription, ar: e.target.value } })} />}
            </Field>
            <Field label={a('services.shortEn')}>
              {(p) => <Textarea {...p} dir="ltr" className="min-h-20" value={s.shortDescription.en} onChange={(e) => patch({ shortDescription: { ...s.shortDescription, en: e.target.value } })} />}
            </Field>
            <Field label={a('common.category')}>
              {(p) => (
                <Select {...p} value={s.categoryId} onChange={(e) => patch({ categoryId: e.target.value })}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {l(c.name)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={a('common.provider')}>
              {(p) => (
                <Select {...p} value={s.providerId} onChange={(e) => patch({ providerId: e.target.value })}>
                  {providers.map((x) => (
                    <option key={x.id} value={x.id}>
                      {l(x.name)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <Card title={a('services.packages')}>
          <div className="space-y-4">
            {s.packages.map((p, i) => (
              <div key={p.id} className="rounded-xl border border-ink-100 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <Field label={`${a('services.pkgName')} (${a('common.arabic')})`} className="lg:col-span-2">
                    {(f) => <Input {...f} dir="rtl" value={p.name.ar} onChange={(e) => setPkg(i, { name: { ...p.name, ar: e.target.value } })} />}
                  </Field>
                  <Field label={`${a('services.pkgName')} (${a('common.english')})`} className="lg:col-span-2">
                    {(f) => <Input {...f} dir="ltr" value={p.name.en} onChange={(e) => setPkg(i, { name: { ...p.name, en: e.target.value } })} />}
                  </Field>
                  <Field label={a('services.price')}>
                    {(f) => <Input {...f} type="number" min={1} value={p.price} onChange={(e) => setPkg(i, { price: numIn(e.target.value) })} />}
                  </Field>
                  <Field label={a('services.duration')}>
                    {(f) => <Input {...f} type="number" min={5} step={5} value={p.durationMinutes} onChange={(e) => setPkg(i, { durationMinutes: numIn(e.target.value) })} />}
                  </Field>
                  <Field label={a('services.maxGuests')}>
                    {(f) => <Input {...f} type="number" min={1} value={p.maxAttendees} onChange={(e) => setPkg(i, { maxAttendees: numIn(e.target.value) })} />}
                  </Field>
                  <div className="flex items-end pb-2 lg:col-span-5">
                    <Toggle checked={!!p.popular} disabled={!editable} onChange={(v) => patch({ packages: s.packages.map((x, j) => ({ ...x, popular: j === i ? v : v ? false : x.popular })) })} label={a('services.popular')} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={a('services.addOns')}>
          <div className="space-y-3">
            {s.addOns.map((x, i) => (
              <div key={x.id} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_10rem]">
                <Field label={`${a('services.addOns')} (${a('common.arabic')})`}>
                  {(f) => <Input {...f} dir="rtl" value={x.name.ar} onChange={(e) => setAddOn(i, { name: { ...x.name, ar: e.target.value } })} />}
                </Field>
                <Field label={`${a('services.addOns')} (${a('common.english')})`}>
                  {(f) => <Input {...f} dir="ltr" value={x.name.en} onChange={(e) => setAddOn(i, { name: { ...x.name, en: e.target.value } })} />}
                </Field>
                <Field label={a('services.price')}>
                  {(f) => <Input {...f} type="number" min={0} value={x.price} onChange={(e) => setAddOn(i, { price: numIn(e.target.value) })} />}
                </Field>
              </div>
            ))}
            {s.extraHourPrice !== undefined && (
              <div className="grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-2">
                <Field label={a('services.extraHourPrice')}>
                  {(f) => <Input {...f} type="number" min={0} value={s.extraHourPrice} onChange={(e) => patch({ extraHourPrice: numIn(e.target.value) })} />}
                </Field>
                <Field label={a('services.maxExtraHours')}>
                  {(f) => <Input {...f} type="number" min={0} max={6} value={s.maxExtraHours} onChange={(e) => patch({ maxExtraHours: numIn(e.target.value) })} />}
                </Field>
              </div>
            )}
          </div>
        </Card>

        <Card title={a('services.reach')}>
          <SectionTitle>{a('common.cities')}</SectionTitle>
          <CheckboxGrid disabled={!editable} options={cities.map((c) => ({ id: c.id, label: l(c.name) }))} value={s.cityIds} onChange={(v) => patch({ cityIds: v })} />
          <div className="mt-5" />
          <SectionTitle>{a('services.eventTypes')}</SectionTitle>
          <CheckboxGrid disabled={!editable} options={eventTypes.map((c) => ({ id: c.id, label: l(c.name) }))} value={s.eventTypeIds} onChange={(v) => patch({ eventTypeIds: v })} />
        </Card>

        <Card title={a('services.visibility')}>
          <div className="space-y-4">
            <Toggle checked={s.active} disabled={!editable} onChange={(v) => patch({ active: v })} label={a('services.activeLabel')} />
            <Toggle checked={!!s.featured} disabled={!editable} onChange={(v) => patch({ featured: v })} label={a('services.featuredLabel')} />
          </div>
        </Card>
      </fieldset>

      {editable && (
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <Button onClick={save} loading={saving} className="shadow-lift">
            {a('common.save')}
          </Button>
        </div>
      )}
    </>
  );
}
