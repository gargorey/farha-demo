import { useState } from 'react';
import { Check, Minus, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Field, Input, Select } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '../api';
import { ROLE_PERMISSIONS, ROLES } from '../auth/roles';
import { useSession } from '../auth/session';
import { Card, PageHeader, ReadOnlyNote, Toggle, table, useToast } from '../components/ui';
import { useAdminLocale } from '../i18n';
import { PERMISSIONS, type RoleId, type StaffUser } from '../models';
import { newId } from '../utils/helpers';

export default function StaffPage() {
  const { a, dateTime } = useAdminLocale();
  const { user, can } = useSession();
  const toast = useToast();
  const editable = can('staff.manage');
  const staff = useAsync(() => adminApi.listStaff(), []);
  const audit = useAsync(() => adminApi.listAudit(30), [staff.data]);
  const [edit, setEdit] = useState<StaffUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (!edit) return;
    if (!edit.name.trim() || !/^\S+@\S+\.\S+$/.test(edit.email)) {
      setErr(a('staff.invalid'));
      return;
    }
    setSaving(true);
    try {
      await adminApi.saveStaff(edit);
      toast(a('common.saved'));
      setEdit(null);
      staff.reload();
    } catch {
      setErr(a('staff.invalid'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={a('staff.title')}
        subtitle={a('staff.subtitle')}
        actions={
          editable && (
            <Button
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                setIsNew(true);
                setErr('');
                setEdit({ id: newId('usr'), name: '', email: '', role: 'operations', active: true });
              }}
            >
              {a('staff.add')}
            </Button>
          )
        }
      />
      {!editable && <ReadOnlyNote />}

      <Card bodyClassName="p-0">
        {staff.loading && !staff.data ? (
          <LoadingBlock />
        ) : staff.error || !staff.data ? (
          <div className="p-5">
            <ErrorState error={staff.error} onRetry={staff.reload} />
          </div>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  {(['name', 'email', 'role', 'status', 'last'] as const).map((c) => (
                    <th key={c} scope="col" className={table.th}>
                      {a(`staff.col.${c}`)}
                    </th>
                  ))}
                  {editable && <th className={table.th}><span className="sr-only">{a('common.actions')}</span></th>}
                </tr>
              </thead>
              <tbody>
                {staff.data.map((u) => (
                  <tr key={u.id} className={table.row}>
                    <td className={`${table.td} font-semibold`}>
                      {u.name}
                      {u.id === user?.id && <span className="ms-1.5 text-xs font-normal text-ink-500">({a('staff.you')})</span>}
                    </td>
                    <td className={table.td}>{u.email}</td>
                    <td className={table.td}>
                      <Badge tone={u.role === 'admin' ? 'plum' : 'neutral'}>{a(`roles.${u.role}`)}</Badge>
                    </td>
                    <td className={table.td}>{u.active ? <Badge tone="mint">{a('common.active')}</Badge> : <Badge>{a('staff.disabled')}</Badge>}</td>
                    <td className={`${table.td} whitespace-nowrap text-ink-500`}>{u.lastActiveAt ? dateTime(u.lastActiveAt) : a('staff.never')}</td>
                    {editable && (
                      <td className={`${table.td} text-end`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Pencil className="size-4" aria-hidden="true" />}
                          onClick={() => {
                            setIsNew(false);
                            setErr('');
                            setEdit({ ...u });
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
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card title={a('staff.matrix')} className="xl:col-span-3" bodyClassName="p-0">
          <div className={table.wrap}>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th className={table.th} scope="col">
                    <span className="sr-only">{a('staff.role')}</span>
                  </th>
                  {ROLES.map((r) => (
                    <th key={r} scope="col" className={`${table.th} text-center`}>
                      {a(`roles.${r}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" className={`${table.td} text-start font-medium`}>
                    {a('staff.viewAll')}
                  </th>
                  {ROLES.map((r) => (
                    <td key={r} className={`${table.td} text-center`}>
                      <Check className="mx-auto size-4 text-mint-600" aria-label={a('common.yes')} />
                    </td>
                  ))}
                </tr>
                {PERMISSIONS.map((p) => (
                  <tr key={p}>
                    <th scope="row" className={`${table.td} text-start font-medium`}>
                      {a(`perm.${p}`)}
                    </th>
                    {ROLES.map((r) => (
                      <td key={r} className={`${table.td} text-center`}>
                        {ROLE_PERMISSIONS[r].includes(p) ? (
                          <Check className="mx-auto size-4 text-mint-600" aria-label={a('common.yes')} />
                        ) : (
                          <Minus className="mx-auto size-4 text-ink-300" aria-label={a('common.no')} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={a('staff.audit')} className="xl:col-span-2" bodyClassName="p-0">
          {!audit.data?.length ? (
            <p className="p-5 text-sm text-ink-500">{audit.loading ? '…' : a('staff.auditEmpty')}</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-ink-100 overflow-y-auto">
              {audit.data.map((e) => (
                <li key={e.id} className="px-5 py-3 text-sm">
                  <p>
                    <span className="font-semibold">{e.by}</span> · <code className="rounded bg-sand-100 px-1 text-xs">{e.action}</code>{' '}
                    <span className="ltr-value">{e.target}</span>
                  </p>
                  {e.detail && <p className="text-xs text-ink-700">“{e.detail}”</p>}
                  <p className="text-xs text-ink-500">{dateTime(e.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={isNew ? a('staff.newTitle') : a('staff.editTitle')}
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
            {err && <p role="alert" className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">{err}</p>}
            <Field label={a('staff.name')} required>
              {(p) => <Input {...p} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />}
            </Field>
            <Field label={a('staff.email')} required>
              {(p) => <Input {...p} dir="ltr" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />}
            </Field>
            <Field label={a('staff.role')} hint={a(`roles.desc.${edit.role}`)}>
              {(p) => (
                <Select {...p} value={edit.role} disabled={edit.id === user?.id} onChange={(e) => setEdit({ ...edit, role: e.target.value as RoleId })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {a(`roles.${r}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Toggle checked={edit.active} disabled={edit.id === user?.id} onChange={(v) => setEdit({ ...edit, active: v })} label={a('staff.activeLabel')} />
          </div>
        )}
      </Modal>
    </>
  );
}
