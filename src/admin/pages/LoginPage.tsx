import { useState, type FormEvent, type ReactNode } from 'react';
import { FlaskConical, LockKeyhole, LogIn } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Button } from '@/components/common/Button';
import { Field, Input } from '@/components/common/Field';
import { cn } from '@/components/common/cn';
import { ApiError } from '@/models';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { adminStore } from '../data/admin-store';
import { useAdminLocale } from '../i18n';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-plum-950 px-4 py-10">
      <div className="mx-auto flex max-w-xl justify-end">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-white p-6 shadow-lift sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-gold-400">
          <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
            <path d="M16 4l2.9 7.1L26.5 12l-5.7 4.8L22.6 24 16 20l-6.6 4 1.8-7.2L5.5 12l7.6-.9z" fill="#2d1648" />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">{title}</h1>
        <p className="mt-1 text-ink-500">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

/** Demo: choose a sample account (no password). */
function DemoLogin() {
  const { a } = useAdminLocale();
  const { signIn } = useSession();
  const staff = adminStore.load().staff;
  return (
    <AuthShell title={a('login.title')} subtitle={a('login.subtitle')}>
      <ul className="mt-6 space-y-2.5">
        {staff.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              disabled={!u.active}
              onClick={() => signIn(u)}
              aria-label={a('login.signInAs', { name: u.name })}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl border border-ink-100 p-4 text-start transition-colors',
                u.active ? 'hover:border-plum-200 hover:bg-plum-50' : 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-plum-100 font-bold text-plum-800" aria-hidden="true">
                {u.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{u.name}</span>
                <span className="block text-sm text-ink-500">
                  {a(`roles.${u.role}`)} · {u.active ? a(`roles.desc.${u.role}`) : a('login.inactive')}
                </span>
              </span>
              {u.active && <LogIn className="flip-rtl size-5 shrink-0 text-plum-600" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-start gap-2 rounded-xl bg-gold-100 px-4 py-3 text-sm text-gold-600">
        <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {a('login.demoNote')}
      </p>
    </AuthShell>
  );
}

/** Backend: work e-mail and password. */
function PasswordLogin() {
  const { a } = useAdminLocale();
  const { signInWithPassword } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError(a('login.missing'));
    setBusy(true);
    setError('');
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setPassword('');
      setError(
        err instanceof ApiError && err.code === 'UNAUTHORIZED'
          ? a('login.invalid')
          : err instanceof ApiError && err.code === 'RATE_LIMITED'
            ? a('login.tooMany')
            : a('common.saveFailed'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={a('login.title')} subtitle={a('login.liveSubtitle')}>
      <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
        {error && (
          <p role="alert" className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-600">
            {error}
          </p>
        )}
        <Field label={a('login.email')} required>
          {(p) => <Input {...p} dir="ltr" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label={a('login.password')} required>
          {(p) => <Input {...p} dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Button type="submit" loading={busy} icon={<LogIn className="flip-rtl size-4" aria-hidden="true" />}>
          {a('login.submit')}
        </Button>
      </form>
      <p className="mt-6 flex items-start gap-2 text-sm text-ink-500">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {a('login.liveNote')}
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return adminApi.isDemo ? <DemoLogin /> : <PasswordLogin />;
}
