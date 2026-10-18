import { useState } from 'react';
import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Field, Input, Select } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { ApiError } from '@/models';
import { addDays, todayISO } from '@/utils/dates';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, ConfirmDialog, PageHeader, ReadOnlyNote, SectionTitle, Toggle, table, useToast } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { Promotion, PromotionKind } from '../models';
import { newId } from '../utils/helpers';
import { CheckboxGrid } from './ServiceEditPage';

type PromoState = 'scheduled' | 'live' | 'expired' | 'paused' | 'usedUp';
const TONE: Record<PromoState, 'mint' | 'gold' | 'neutral' | 'coral'> = { live: 'mint', scheduled: 'gold', expired: 'neutral', paused: 'neutral', usedUp: 'coral' };

export function promoState(p: Promotion, today = todayISO()): PromoState {
  if (!p.active) return 'paused';
  if (p.maxUses != null && p.uses >= p.maxUses) return 'usedUp';
  if (today < p.startsOn) return 'scheduled';
  if (today > p.endsOn) return 'expired';
  return 'live';
}

export default function PromotionsPage() {
  const { a, l, money, num, date } = useAdminLocale();
  const { categories } = useCatalog();
  const { can } = useSession();
  const toast = useToast();
  const editable = can('promotions.manage');
  const { data, error, loading, reload } = useAsync(() => adminApi.listPromotions(), []);
  const [edit, setEdit] = useState<Promotion | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [del, setDel] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!edit) return;
    if (!/^[A-Za-z0-9-]{3,20}$/.test(edit.code.trim()) || !(edit.value > 0) || (edit.kind === 'percent' && edit.value > 100) || edit.endsOn < edit.startsOn) {
      setErr(a('promotions.invalid'));
      return;
    }
    setSaving(true);
    try {
      await adminApi.savePromotion(edit);
      toast(a('common.saved'));
      setEdit(null);
      reload();
    } catch (e) {
      setErr(e instanceof ApiError && e.code === 'CONFLICT' ? a('promotions.codeTaken') : a('common.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const discount = (p: Promotion) => (p.kind === 'percent' ? `${num(p.value)}%` : money(p.value));

  return (
    <>
      <PageHeader
        title={a('promotions.title')}
        subtitle={a('promotions.subtitle')}
        actions={
          editable && (
            <Button
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                setIsNew(true);
                setErr('');
                setEdit({ id: newId('promo'), code: '', name: { ar: '', en: '' }, kind: 'percent', value: 10, minSubtotal: 0, startsOn: todayISO(), endsOn: addDays(todayISO(), 30), uses: 0, active: true, categoryIds: [] });
              }}
            >
              {a('promotions.add')}
            </Button>
          )
        }
      />
      {!editable && <ReadOnlyNote />}
      <p className="mb-5 flex items-start gap-2 rounded-xl bg-plum-50 px-4 py-2.5 text-sm text-plum-800">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {a('promotions.demoNote')}
      </p>
      <Card bodyClassName="p-0">
        {loading && !data ? (
          <LoadingBlock />
        ) : error || !data ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  {(['code', 'name', 'discount', 'validity', 'uses', 'status'] as const).map((c) => (
                    <th key={c} scope="col" className={table.th}>
                      {a(`promotions.col.${c}`)}
                    </th>
                  ))}
                  {editable && <th className={table.th}><span className="sr-only">{a('common.actions')}</span></th>}
                </tr>
              </thead>
              <tbody>
                {data.map((p) => {
                  const st = promoState(p);
                  return (
                    <tr key={p.id} className={table.row}>
                      <td className={`${table.td} font-mono font-bold`}>
                        <span className="ltr-value">{p.code}</span>
                      </td>
                      <td className={table.td}>
                        <div className="font-medium">{l(p.name)}</div>
                        <div className="text-xs text-ink-500">
                          {p.categoryIds.length ? p.categoryIds.map((id) => l(categories.find((c) => c.id === id)?.name)).join('، ') : a('promotions.allCategories')}
                        </div>
                      </td>
                      <td className={`${table.td} whitespace-nowrap`}>
                        {discount(p)}
                        {p.minSubtotal > 0 && <div className="text-xs text-ink-500">≥ {money(p.minSubtotal)}</div>}
                      </td>
                      <td className={`${table.td} whitespace-nowrap text-xs`}>
                        {date(p.startsOn, 'medium')} – {date(p.endsOn, 'medium')}
                      </td>
                      <td className={`${table.td} tabular-nums`}>
                        {num(p.uses)}
                        {p.maxUses != null && <span className="text-ink-500"> / {num(p.maxUses)}</span>}
                      </td>
                      <td className={table.td}>
                        <Badge tone={TONE[st]}>{a(`promotions.state.${st}`)}</Badge>
                      </td>
                      {editable && (
                        <td className={`${table.td} whitespace-nowrap text-end`}>
                          <Button size="sm" variant="ghost" aria-label={a('common.edit')} icon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => { setIsNew(false); setErr(''); setEdit(structuredClone(p)); }} />
                          <Button size="sm" variant="ghost" aria-label={a('common.delete')} icon={<Trash2 className="size-4 text-coral-600" aria-hidden="true" />} onClick={() => setDel(p)} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={isNew ? a('promotions.newTitle') : a('promotions.editTitle')}
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
              <Field label={a('promotions.code')} required>
                {(p) => <Input {...p} dir="ltr" className="font-mono uppercase" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} />}
              </Field>
              <Field label={a('promotions.type')}>
                {(p) => (
                  <Select {...p} value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as PromotionKind })}>
                    <option value="percent">{a('promotions.kind.percent')}</option>
                    <option value="fixed">{a('promotions.kind.fixed')}</option>
                  </Select>
                )}
              </Field>
              <Field label={a('promotions.nameAr')}>
                {(p) => <Input {...p} dir="rtl" value={edit.name.ar} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ar: e.target.value } })} />}
              </Field>
              <Field label={a('promotions.nameEn')}>
                {(p) => <Input {...p} dir="ltr" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} />}
              </Field>
              <Field label={`${a('promotions.value')} (${edit.kind === 'percent' ? '%' : a('common.sar')})`} required>
                {(p) => <Input {...p} type="number" min={1} value={edit.value} onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })} />}
              </Field>
              <Field label={a('promotions.minSubtotal')}>
                {(p) => <Input {...p} type="number" min={0} value={edit.minSubtotal} onChange={(e) => setEdit({ ...edit, minSubtotal: Number(e.target.value) || 0 })} />}
              </Field>
              <Field label={a('promotions.startsOn')}>
                {(p) => <Input {...p} type="date" value={edit.startsOn} onChange={(e) => setEdit({ ...edit, startsOn: e.target.value })} />}
              </Field>
              <Field label={a('promotions.endsOn')}>
                {(p) => <Input {...p} type="date" value={edit.endsOn} onChange={(e) => setEdit({ ...edit, endsOn: e.target.value })} />}
              </Field>
              <Field label={a('promotions.maxUses')} hint={a('promotions.unlimited')}>
                {(p) => (
                  <Input {...p} type="number" min={1} value={edit.maxUses ?? ''} onChange={(e) => setEdit({ ...edit, maxUses: e.target.value ? Number(e.target.value) : undefined })} />
                )}
              </Field>
              <div className="flex items-end pb-2">
                <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label={a('promotions.activeLabel')} />
              </div>
            </div>
            <div>
              <SectionTitle>{a('promotions.categories')}</SectionTitle>
              <p className="mb-2 text-xs text-ink-500">{a('promotions.allCategories')}: {edit.categoryIds.length === 0 ? a('common.yes') : a('common.no')}</p>
              <CheckboxGrid options={categories.map((c) => ({ id: c.id, label: l(c.name) }))} value={edit.categoryIds} onChange={(v) => setEdit({ ...edit, categoryIds: v })} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        title={a('promotions.deleteTitle', { code: del?.code ?? '' })}
        text={a('promotions.deleteText')}
        confirmLabel={a('common.delete')}
        tone="danger"
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          await adminApi.deletePromotion(del.id);
          setDel(null);
          toast(a('common.saved'));
          reload();
        }}
      />
    </>
  );
}
