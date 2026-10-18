import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Field, Input, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { Card, PageHeader, ReadOnlyNote, Toggle, table, useToast } from '../components/ui';
import { useCatalog } from '../hooks/useCatalog';
import { useAdminLocale } from '../i18n';
import type { AdminCategory } from '../models';

export default function CategoriesPage() {
  const { a, l, num } = useAdminLocale();
  const { categories, services, reload } = useCatalog();
  const { can } = useSession();
  const toast = useToast();
  const editable = can('catalog.manage');
  const [edit, setEdit] = useState<AdminCategory | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!edit || !edit.name.ar.trim() || !edit.name.en.trim()) return;
    setSaving(true);
    try {
      await adminApi.saveCategory(edit);
      toast(a('common.saved'));
      setEdit(null);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title={a('categories.title')} subtitle={a('categories.subtitle')} />
      {!editable && <ReadOnlyNote />}
      <Card bodyClassName="p-0">
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                {(['order', 'name', 'services', 'visible'] as const).map((c) => (
                  <th key={c} scope="col" className={table.th}>
                    {a(`categories.col.${c}`)}
                  </th>
                ))}
                {editable && <th className={table.th}><span className="sr-only">{a('common.actions')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className={table.row}>
                  <td className={`${table.td} w-20 tabular-nums`}>{num(c.sortOrder)}</td>
                  <td className={table.td}>
                    <div className="font-semibold">{l(c.name)}</div>
                    <div className="max-w-md truncate text-xs text-ink-500">{l(c.description)}</div>
                  </td>
                  <td className={`${table.td} tabular-nums`}>{num(services.filter((s) => s.categoryId === c.id).length)}</td>
                  <td className={table.td}>{c.active ? <Badge tone="mint">{a('common.active')}</Badge> : <Badge>{a('common.inactive')}</Badge>}</td>
                  {editable && (
                    <td className={`${table.td} text-end`}>
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setEdit(structuredClone(c))}>
                        {a('common.edit')}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={a('categories.editTitle')}
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
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={a('services.nameAr')} required>
                {(p) => <Input {...p} dir="rtl" value={edit.name.ar} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, ar: e.target.value } })} />}
              </Field>
              <Field label={a('services.nameEn')} required>
                {(p) => <Input {...p} dir="ltr" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} />}
              </Field>
            </div>
            <Field label={a('categories.descAr')}>
              {(p) => <Textarea {...p} dir="rtl" className="min-h-16" value={edit.description.ar} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, ar: e.target.value } })} />}
            </Field>
            <Field label={a('categories.descEn')}>
              {(p) => <Textarea {...p} dir="ltr" className="min-h-16" value={edit.description.en} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, en: e.target.value } })} />}
            </Field>
            <Field label={a('categories.order')}>
              {(p) => <Input {...p} type="number" min={1} value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) || 1 })} />}
            </Field>
            <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label={a('services.activeLabel')} />
          </div>
        )}
      </Modal>
    </>
  );
}
