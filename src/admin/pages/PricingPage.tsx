import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Field, Input, Select } from '@/components/common/Field';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useReferenceData } from '@/hooks/useReferenceData';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, PageHeader, ReadOnlyNote, Toggle, useToast } from '../components/ui';
import { useAdminLocale } from '../i18n';
import type { PricingSettings } from '../models';

export default function PricingPage() {
  const { a } = useAdminLocale();
  const { data, error, loading, reload } = useAsync(() => adminApi.getPricingSettings(), []);
  if (loading && !data) return <LoadingBlock />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} title={a('common.loadFailed')} />;
  return <PricingForm initial={data} />;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function PricingForm({ initial }: { initial: PricingSettings }) {
  const { a, l, money } = useAdminLocale();
  const { cities } = useReferenceData();
  const { can } = useSession();
  const toast = useToast();
  const editable = can('pricing.manage');
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [previewCity, setPreviewCity] = useState(cities.find((c) => (initial.travelFees[c.id] ?? 0) > 0)?.id ?? cities[0].id);

  const patch = (p: Partial<PricingSettings>) => setS((x) => ({ ...x, ...p }));
  const int = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  async function save() {
    if (s.vat.rate < 0 || s.vat.rate > 1 || s.defaultCommissionRate < 0 || s.defaultCommissionRate > 1 || s.maxAdvanceDays < s.minLeadDays) {
      setErr(a('pricing.invalid'));
      return;
    }
    setErr('');
    setSaving(true);
    try {
      await adminApi.updatePricingSettings(s);
      toast(a('common.saved'));
    } catch {
      setErr(a('pricing.invalid'));
    } finally {
      setSaving(false);
    }
  }

  // Worked example so the effect of each setting is visible before saving.
  const base = 1000;
  const travel = s.applyTravelFee ? (s.travelFees[previewCity] ?? 0) : 0;
  const subtotal = base + travel;
  const vat = !s.vat.enabled ? 0 : s.vat.pricesIncludeVat ? round2(subtotal - subtotal / (1 + s.vat.rate)) : round2(subtotal * s.vat.rate);
  const total = s.vat.pricesIncludeVat ? subtotal : subtotal + vat;

  return (
    <>
      <PageHeader
        title={a('pricing.title')}
        subtitle={a('pricing.subtitle')}
        actions={
          editable && (
            <Button onClick={save} loading={saving}>
              {a('common.save')}
            </Button>
          )
        }
      />
      {!editable && <ReadOnlyNote />}
      <p className="mb-5 flex items-start gap-2 rounded-xl bg-gold-100 px-4 py-2.5 text-sm text-gold-600">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {a('pricing.assumptions')}
      </p>
      {err && (
        <p role="alert" className="mb-5 rounded-xl bg-coral-100 px-4 py-2.5 text-sm font-medium text-coral-600">
          {err}
        </p>
      )}

      <fieldset disabled={!editable} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={a('pricing.vat')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <Toggle disabled={!editable} checked={s.vat.enabled} onChange={(v) => patch({ vat: { ...s.vat, enabled: v } })} label={a('pricing.vatEnabled')} />
                <Toggle disabled={!editable} checked={s.vat.pricesIncludeVat} onChange={(v) => patch({ vat: { ...s.vat, pricesIncludeVat: v } })} label={a('pricing.vatIncluded')} />
              </div>
              <Field label={a('pricing.vatRate')}>
                {(p) => <Input {...p} type="number" min={0} max={100} step={0.5} value={round2(s.vat.rate * 100)} onChange={(e) => patch({ vat: { ...s.vat, rate: Number(e.target.value) / 100 } })} />}
              </Field>
            </div>
          </Card>

          <Card title={a('pricing.rules')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={a('pricing.minLead')}>
                {(p) => <Input {...p} type="number" min={0} value={s.minLeadDays} onChange={(e) => patch({ minLeadDays: int(e.target.value) })} />}
              </Field>
              <Field label={a('pricing.maxAdvance')}>
                {(p) => <Input {...p} type="number" min={1} value={s.maxAdvanceDays} onChange={(e) => patch({ maxAdvanceDays: int(e.target.value) })} />}
              </Field>
              <Field label={a('pricing.cancelHours')}>
                {(p) => <Input {...p} type="number" min={0} value={s.cancellationCutoffHours} onChange={(e) => patch({ cancellationCutoffHours: int(e.target.value) })} />}
              </Field>
              <Field label={a('pricing.modHours')}>
                {(p) => <Input {...p} type="number" min={0} value={s.modificationCutoffHours} onChange={(e) => patch({ modificationCutoffHours: int(e.target.value) })} />}
              </Field>
              <Field label={a('pricing.commission')}>
                {(p) => <Input {...p} type="number" min={0} max={100} value={round2(s.defaultCommissionRate * 100)} onChange={(e) => patch({ defaultCommissionRate: Number(e.target.value) / 100 })} />}
              </Field>
              <div className="flex items-end pb-2">
                <Toggle disabled={!editable} checked={s.freeWithdrawalBeforeConfirmation} onChange={(v) => patch({ freeWithdrawalBeforeConfirmation: v })} label={a('pricing.freeWithdrawal')} />
              </div>
            </div>
          </Card>

          <Card title={a('pricing.travel')}>
            <Toggle disabled={!editable} checked={s.applyTravelFee} onChange={(v) => patch({ applyTravelFee: v })} label={a('pricing.applyTravel')} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {cities.map((c) => (
                <label key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2">
                  <span className="text-sm font-medium">{l(c.name)}</span>
                  <span className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={25}
                      className="w-24 py-1.5"
                      aria-label={`${a('pricing.travelFee')} – ${l(c.name)}`}
                      disabled={!s.applyTravelFee || !editable}
                      value={s.travelFees[c.id] ?? 0}
                      onChange={(e) => patch({ travelFees: { ...s.travelFees, [c.id]: int(e.target.value) } })}
                    />
                    <span className="text-xs text-ink-500">{a('common.sar')}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title={a('pricing.preview')} className="lg:sticky lg:top-24">
            <Select value={previewCity} onChange={(e) => setPreviewCity(e.target.value)} aria-label={a('common.city')} disabled={false}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {l(c.name)}
                </option>
              ))}
            </Select>
            <p className="mt-3 text-sm text-ink-500">{a('pricing.previewText', { price: money(base), city: l(cities.find((c) => c.id === previewCity)?.name) })}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt>{a('services.pkgName')}</dt>
                <dd className="tabular-nums">{money(base)}</dd>
              </div>
              {travel > 0 && (
                <div className="flex justify-between">
                  <dt>{a('pricing.previewTravel')}</dt>
                  <dd className="tabular-nums">{money(travel)}</dd>
                </div>
              )}
              {s.vat.enabled && (
                <div className="flex justify-between text-ink-500">
                  <dt>
                    {a('pricing.vat')} ({round2(s.vat.rate * 100)}%)
                  </dt>
                  <dd className="tabular-nums">{money(vat)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold">
                <dt>{a('pricing.previewTotal')}</dt>
                <dd className="tabular-nums">{money(total)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </fieldset>
    </>
  );
}
