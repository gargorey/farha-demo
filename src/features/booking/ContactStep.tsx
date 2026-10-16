import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { DemoNote } from '@/components/common/DemoNote';
import { Field, Input } from '@/components/common/Field';
import { cn } from '@/components/common/cn';
import { contactSchema, type ContactFormValues } from './schemas';
import { StepActions } from './StepActions';
import { useFieldError } from './useFieldError';
import type { BookingDraft } from './useBookingDraft';

const methods = [
  { id: 'whatsapp', Icon: MessageCircle },
  { id: 'phone', Icon: Phone },
  { id: 'email', Icon: Mail },
] as const;

export function ContactStep({ value, onBack, onNext }: { value: BookingDraft['customer']; onBack: (v: BookingDraft['customer']) => void; onNext: (v: ContactFormValues) => void }) {
  const { t } = useLocale();
  const fieldError = useFieldError();
  const { register, handleSubmit, getValues, watch, formState: { errors } } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    // The +966 prefix is shown separately, so edit only the national part.
    defaultValues: { ...value, phone: value.phone.replace(/^\+966/, '') },
    mode: 'onTouched',
  });
  const method = watch('contactMethod');

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate>
      <h2 className="mb-6 text-xl font-bold">{t('booking.steps.contact')}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('booking.fullName')} required error={fieldError(errors.fullName)} className="sm:col-span-2">
          {(p) => <Input {...p} autoComplete="name" {...register('fullName')} />}
        </Field>
        <Field label={t('booking.phone')} required error={fieldError(errors.phone)} hint={t('booking.phoneHint')}>
          {(p) => (
            <div className="flex" dir="ltr">
              <span className="inline-flex items-center rounded-s-xl border border-e-0 border-ink-100 bg-sand-100 px-3 text-sm font-semibold text-ink-700">🇸🇦 +966</span>
              <Input {...p} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="5X XXX XXXX" className="rounded-s-none" {...register('phone')} />
            </div>
          )}
        </Field>
        <Field label={t('booking.email')} required error={fieldError(errors.email)}>
          {(p) => <Input {...p} type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" {...register('email')} />}
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold text-ink-700">{t('booking.contactMethod')}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {methods.map(({ id, Icon }) => (
              <label key={id} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors', method === id ? 'border-plum-700 bg-plum-50 text-plum-800' : 'border-ink-100 bg-white hover:border-plum-200')}>
                <input type="radio" value={id} className="sr-only" {...register('contactMethod')} />
                <Icon className="size-4" aria-hidden="true" />
                {t(`booking.contactMethods.${id}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <DemoNote className="mt-6">{t('booking.privacyNote')}</DemoNote>
      <StepActions onBack={() => onBack(getValues())} />
    </form>
  );
}
