import { useState, type FormEvent } from 'react';
import { KeyRound, Smartphone } from 'lucide-react';
import { ApiError } from '@/models';
import { api } from '@/services/api';
import { useLocale } from '@/hooks/useLocale';
import { normalizeSaudiMobile } from '@/utils/phone';
import { Button } from '@/components/common/Button';
import { Field, Input } from '@/components/common/Field';

/**
 * Sign-in with a mobile number and a one-time SMS code (backend mode only).
 * Bookings made in this browser are visible without it; signing in shows every
 * booking made with the number, on any device.
 */
export function PhoneSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [demoCode, setDemoCode] = useState<string>();

  const failMessage = (e: unknown) => (e instanceof ApiError && e.code === 'RATE_LIMITED' ? t('auth.rateLimited') : t('auth.failed'));

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    const normalized = normalizeSaudiMobile(phone);
    if (!normalized) return setError(t('validation.phone'));
    setBusy(true);
    setError(undefined);
    try {
      const res = await api.requestSignInCode(normalized);
      setDemoCode(res.demoCode);
      setStep('code');
    } catch (err) {
      setError(failMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError(t('auth.codeInvalid'));
    setBusy(true);
    setError(undefined);
    try {
      await api.verifySignInCode(normalizeSaudiMobile(phone)!, code);
      onSignedIn();
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'VALIDATION_ERROR' ? t('auth.codeInvalid') : failMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 sm:p-6" aria-labelledby="signin-title">
      <h2 id="signin-title" className="flex items-center gap-2 text-lg font-bold">
        <Smartphone className="size-5 text-plum-600" aria-hidden="true" />
        {t('auth.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{t('auth.text')}</p>
      {step === 'phone' ? (
        <form onSubmit={sendCode} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <Field label={t('booking.phone')} error={error} className="flex-1">
            {(p) => <Input {...p} dir="ltr" type="tel" inputMode="tel" autoComplete="tel" placeholder="05X XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          <Button type="submit" loading={busy} className={error ? 'sm:mb-6' : ''}>
            {t('auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <Field label={t('auth.codeLabel')} hint={demoCode ? t('auth.demoCode', { code: demoCode }) : t('auth.codeSent')} error={error} className="flex-1">
            {(p) => (
              <Input {...p} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={busy} icon={<KeyRound className="size-4" aria-hidden="true" />}>
              {t('auth.verify')}
            </Button>
            <Button variant="ghost" onClick={() => { setStep('phone'); setCode(''); setError(undefined); }}>
              {t('auth.changeNumber')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
