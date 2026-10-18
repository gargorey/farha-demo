import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { api } from '@/services/api';
import { businessConfig } from '@/config/business';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { contactMessageSchema, type ContactMessageValues } from '@/features/booking/schemas';
import { useFieldError } from '@/features/booking/useFieldError';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { DemoNote } from '@/components/common/DemoNote';
import { Field, Input, Select, Textarea } from '@/components/common/Field';

export default function ContactPage() {
  const { t, l } = useLocale();
  useDocumentTitle(t('contact.title'));
  const fieldError = useFieldError();
  const [sentRef, setSentRef] = useState<string>();
  const [sendError, setSendError] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactMessageValues>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSendError(false);
    try {
      const { id } = await api.sendContactMessage(values);
      setSentRef(id);
      reset();
    } catch {
      setSendError(true);
    }
  });

  const { contact } = businessConfig;
  const info = [
    { Icon: Phone, label: t('contact.phoneLabel'), value: <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="ltr-value hover:text-plum-700">{contact.phone}</a> },
    { Icon: MessageCircle, label: t('contact.whatsappLabel'), value: <span className="ltr-value">{contact.whatsapp}</span> },
    { Icon: Mail, label: t('contact.emailLabel'), value: <a href={`mailto:${contact.email}`} className="ltr-value hover:text-plum-700">{contact.email}</a> },
    { Icon: Clock, label: t('contact.hoursLabel'), value: l(contact.hours) },
    { Icon: MapPin, label: t('contact.addressLabel'), value: l(contact.city) },
  ];

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('nav.contact') }]} />
      <h1 className="text-4xl font-extrabold tracking-tight">{t('contact.title')}</h1>
      <p className="mt-2 max-w-2xl text-ink-500">{t('contact.subtitle')}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100 sm:p-8">
          {sentRef ? (
            <div className="py-10 text-center" role="status">
              <CheckCircle2 className="mx-auto size-14 text-mint-600" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-bold">{api.isDemo ? t('contact.successTitle') : t('contact.successTitleLive')}</h2>
              <p className="mt-2 text-ink-500">{api.isDemo ? t('contact.successText', { ref: sentRef }) : t('contact.successTextLive', { ref: sentRef })}</p>
              <Button variant="outline" className="mt-6" onClick={() => setSentRef(undefined)}>{t('contact.sendAnother')}</Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
              <Field label={t('contact.name')} required error={fieldError(errors.name)}>
                {(p) => <Input {...p} autoComplete="name" {...register('name')} />}
              </Field>
              <Field label={t('contact.email')} required error={fieldError(errors.email)}>
                {(p) => <Input {...p} type="email" dir="ltr" autoComplete="email" {...register('email')} />}
              </Field>
              <Field label={t('contact.phone')} error={fieldError(errors.phone)}>
                {(p) => <Input {...p} type="tel" dir="ltr" placeholder="05X XXX XXXX" {...register('phone')} />}
              </Field>
              <Field label={t('contact.subject')} required error={fieldError(errors.subject)}>
                {(p) => (
                  <Select {...p} {...register('subject')}>
                    <option value="">—</option>
                    {(['booking', 'planning', 'provider', 'other'] as const).map((s) => <option key={s} value={s}>{t(`contact.subjects.${s}`)}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={t('contact.message')} required error={fieldError(errors.message)} className="sm:col-span-2">
                {(p) => <Textarea {...p} rows={5} {...register('message')} />}
              </Field>
              {sendError && <p role="alert" className="text-sm text-coral-600 sm:col-span-2">{t('error.text')}</p>}
              <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
                {api.isDemo ? <DemoNote className="flex-1">{t('contact.formDemoNote')}</DemoNote> : <span className="flex-1" />}
                <Button type="submit" size="lg" loading={isSubmitting} icon={<Send className="size-4 flip-rtl" aria-hidden="true" />}>
                  {isSubmitting ? t('contact.sending') : t('contact.send')}
                </Button>
              </div>
            </form>
          )}
        </section>
        <aside className="rounded-3xl bg-plum-900 p-6 text-white sm:p-8">
          <h2 className="text-xl font-bold text-white">{t('contact.infoTitle')}</h2>
          <ul className="mt-6 space-y-5">
            {info.map(({ Icon, label, value }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold-400"><Icon className="size-5" aria-hidden="true" /></span>
                <span>
                  <span className="block text-xs text-white/60">{label}</span>
                  <span className="font-semibold">{value}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-white/55">{t('contact.demoNote')}</p>
        </aside>
      </div>
    </Container>
  );
}
