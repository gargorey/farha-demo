import { useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { Field, Input } from '@/components/common/Field';
import { ApiError } from '@/models';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { useAdminLocale } from '../i18n';

/** New-password form, used at first sign-in and from the account menu. */
export function ChangePasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { a } = useAdminLocale();
  const { user } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 12) return setError(a('account.weakPassword'));
    if (next !== confirm) return setError(a('account.mismatch'));
    setBusy(true);
    setError('');
    try {
      await adminApi.changePassword(current, next);
      onDone();
    } catch (err) {
      const field = err instanceof ApiError ? err.fieldErrors[0]?.field : undefined;
      setError(field === 'currentPassword' ? a('account.wrongPassword') : field === 'newPassword' ? a('account.weakPassword') : a('common.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {error && (
        <p role="alert" className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      )}
      {/* Lets password managers attach the new password to the right account. */}
      <input type="email" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
      <Field label={a('account.currentPassword')} required>
        {(p) => <Input {...p} dir="ltr" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
      </Field>
      <Field label={a('account.newPassword')} hint={a('account.rules')} required>
        {(p) => <Input {...p} dir="ltr" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
      </Field>
      <Field label={a('account.confirmPassword')} required>
        {(p) => <Input {...p} dir="ltr" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {a('common.cancel')}
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {a('account.save')}
        </Button>
      </div>
    </form>
  );
}
