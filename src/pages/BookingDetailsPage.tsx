import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, FlaskConical, MapPin, MessageSquare, StickyNote, Users } from 'lucide-react';
import { ApiError, type Booking } from '@/models';
import { api } from '@/services/api';
import { demoControls } from '@/services/mock/mock-client';
import { businessConfig } from '@/config/business';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { cancellationActionFor, modificationAvailability } from '@/utils/booking-lifecycle';
import { formatDateTime } from '@/utils/format';
import { formatSaudiMobile } from '@/utils/phone';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button, ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { DemoNote } from '@/components/common/DemoNote';
import { Field, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';
import { SmartImage } from '@/components/common/SmartImage';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { StatusBadge } from '@/components/booking/StatusBadge';
import { cn } from '@/components/common/cn';

const NEXT_SIMULATED: Partial<Record<Booking['status'], Booking['status']>> = {
  pending_request: 'pending_confirmation',
  pending_confirmation: 'confirmed',
  confirmed: 'completed',
  cancellation_requested: 'cancelled',
};

export default function BookingDetailsPage() {
  const { id = '' } = useParams();
  const { t, l, date, time, num, locale } = useLocale();
  const { eventTypeById, cityById } = useReferenceData();
  const { data, error, loading, reload } = useAsync(async () => {
    const booking = await api.getBooking(id);
    const service = await api.getService(booking.selection.serviceId);
    return { booking, service };
  }, [id]);
  const [booking, setBooking] = useState<Booking>();
  const [dialog, setDialog] = useState<'modify' | 'cancel' | null>(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const current = booking ?? data?.booking;
  useDocumentTitle(current ? t('bookings.detailTitle', { reference: current.reference }) : t('bookings.title'));

  if (loading && !data) return <LoadingBlock />;
  if (error instanceof ApiError && error.code === 'NOT_FOUND') {
    return (
      <Container className="py-16">
        <EmptyState title={t('bookings.notFoundTitle')} text={t('bookings.notFoundText')} action={<ButtonLink to="/bookings">{t('nav.myBookings')}</ButtonLink>} />
      </Container>
    );
  }
  if (error || !data || !current) return <Container className="py-16"><ErrorState error={error} onRetry={reload} /></Container>;

  const { service } = data;
  const pkg = service.packages.find((p) => p.id === current.selection.packageId);
  const cancel = cancellationActionFor(current);
  const modify = modificationAvailability(current);
  const nextSim = NEXT_SIMULATED[current.status];

  const run = async (fn: () => Promise<Booking>, done: string) => {
    setBusy(true);
    setActionError(undefined);
    try {
      setBooking(await fn());
      setDialog(null);
      setMessage('');
      setNotice(done);
    } catch {
      setActionError(t('error.text'));
    } finally {
      setBusy(false);
    }
  };

  const blockedText = (reason: string) => t(`bookings.blocked.${reason}`);

  return (
    <Container className="max-w-5xl py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('bookings.title'), to: '/bookings' }, { label: current.reference }]} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">{t('bookings.reference')}</p>
          <h1 className="ltr-value text-3xl font-extrabold tracking-wider">{current.reference}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('bookings.createdAt')}: {formatDateTime(current.createdAt, locale)}</p>
        </div>
        <div className="text-end">
          <StatusBadge status={current.status} className="text-sm" />
          <p className="mt-2 max-w-xs text-sm text-ink-500">{t(`status.desc.${current.status}`)}</p>
        </div>
      </header>
      {current.isDemo && <DemoNote className="mt-4">{t('bookings.demoSession')}</DemoNote>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-mint-100 px-4 py-3 text-sm font-semibold text-mint-600">{notice}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-ink-100 sm:flex-row">
            <SmartImage media={service.media[0]} className="aspect-[16/9] w-full shrink-0 rounded-2xl sm:aspect-square sm:size-32" decorative />
            <div className="min-w-0">
              <h2 className="text-xl font-bold"><Link to={`/services/${service.slug}`} className="hover:text-plum-700">{l(service.name)}</Link></h2>
              <p className="text-sm text-ink-500">{t('booking.package')}: <span className="font-semibold text-ink-900">{l(pkg?.name)}</span></p>
              <ul className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
                <li className="flex items-center gap-2"><CalendarDays className="size-4 text-plum-600" aria-hidden="true" />{date(current.event.date)}</li>
                <li className="flex items-center gap-2"><Clock className="size-4 text-plum-600" aria-hidden="true" />{time(current.event.startTime)}</li>
                <li className="flex items-center gap-2"><MapPin className="size-4 text-plum-600" aria-hidden="true" />{current.event.venue}{locale === 'ar' ? '، ' : ', '}{l(cityById(current.event.cityId)?.name)}</li>
                <li className="flex items-center gap-2"><Users className="size-4 text-plum-600" aria-hidden="true" />{num(current.event.attendees)} · {l(eventTypeById(current.event.eventTypeId)?.name)}</li>
              </ul>
              {current.event.notes && <p className="mt-3 flex items-start gap-2 text-sm text-ink-500"><StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{current.event.notes}</p>}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
            <h2 className="mb-4 font-bold">{t('booking.priceSummary')}</h2>
            <PriceSummary pricing={current.pricing} service={service} />
            <p className="mt-3 text-xs text-ink-500">{t('booking.estimateNote')} {t('booking.noPaymentNote')}</p>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
            <h2 className="mb-5 font-bold">{t('bookings.timeline')}</h2>
            <ol className="relative space-y-5 border-s-2 border-plum-100 ps-6">
              {[...current.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className={cn('absolute -start-[1.95rem] top-1 size-3.5 rounded-full ring-4 ring-white', i === 0 ? 'bg-plum-700' : 'bg-plum-200')} aria-hidden="true" />
                  <p className="font-semibold">{t(h.noteKey)}</p>
                  <p className="text-xs text-ink-500">{formatDateTime(h.at, locale)} · {t(`status.${h.status}`)}</p>
                  {h.note && <p className="mt-1 rounded-lg bg-sand-100 px-3 py-2 text-sm text-ink-700">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
            <h2 className="mb-4 font-bold">{t('bookings.actions')}</h2>
            {current.modificationRequest && (
              <p className="mb-4 flex items-start gap-2 rounded-xl bg-plum-50 px-3 py-2.5 text-sm text-plum-800">
                <MessageSquare className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t('bookings.modificationPending', { date: date(current.modificationRequest.requestedAt.slice(0, 10), 'medium'), message: current.modificationRequest.message })}
              </p>
            )}
            <div className="space-y-3">
              <Button variant="outline" className="w-full" disabled={!modify.allowed} onClick={() => { setActionError(undefined); setDialog('modify'); }}>
                {t('bookings.requestModification')}
              </Button>
              {!modify.allowed && <p className="text-xs text-ink-500">{blockedText(modify.reason)}</p>}
              <Button variant="outline" className="w-full border-coral-100 text-coral-600 hover:bg-coral-100" disabled={cancel.kind === 'blocked'} onClick={() => { setActionError(undefined); setDialog('cancel'); }}>
                {cancel.kind === 'withdraw' ? t('bookings.withdrawRequest') : t('bookings.requestCancellation')}
              </Button>
              {cancel.kind === 'blocked' && <p className="text-xs text-ink-500">{blockedText(cancel.reason)}</p>}
            </div>
            <p className="mt-4 text-xs text-ink-500">
              {t('bookings.policyNote', { modHours: num(businessConfig.policy.modificationCutoffHours), cancelHours: num(businessConfig.policy.cancellationCutoffHours) })}
            </p>
          </section>

          <section className="rounded-3xl bg-white p-6 text-sm shadow-soft ring-1 ring-ink-100">
            <h2 className="mb-3 font-bold">{t('bookings.customer')}</h2>
            <p className="font-semibold">{current.customer.fullName}</p>
            <p className="ltr-value text-ink-500">{formatSaudiMobile(current.customer.phone)}</p>
            <p className="ltr-value block text-ink-500">{current.customer.email}</p>
            <p className="mt-2 text-ink-500">{t('bookings.contactVia', { method: t(`booking.contactMethods.${current.customer.contactMethod}`) })}</p>
          </section>

          {current.isDemo && nextSim && (
            <section className="rounded-3xl border-2 border-dashed border-gold-200 bg-gold-100/40 p-6">
              <h2 className="flex items-center gap-2 font-bold"><FlaskConical className="size-4 text-gold-600" aria-hidden="true" />{t('bookings.demoControls')}</h2>
              <p className="mt-1 text-xs text-ink-500">{t('bookings.demoControlsText')}</p>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => run(async () => demoControls.advance(current.id), t(`status.desc.${nextSim}`))}>
                {t('bookings.simulateNext', { status: t(`status.${nextSim}`) })}
              </Button>
            </section>
          )}

          <ButtonLink to="/bookings" variant="ghost" className="w-full">{t('bookings.backToList')}</ButtonLink>
        </aside>
      </div>

      <Modal
        open={dialog === 'modify'}
        onClose={() => setDialog(null)}
        title={t('bookings.modificationTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t('common.cancel')}</Button>
            <Button
              loading={busy}
              onClick={() => {
                if (message.trim().length < 10) return setMessageError(true);
                run(() => api.requestModification(current.id, { message: message.trim() }), t('bookings.modificationSent'));
              }}
            >
              {t('bookings.modificationSend')}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-500">{t('bookings.modificationText')}</p>
        <Field label={t('bookings.modificationLabel')} required error={messageError ? t('validation.message') : undefined}>
          {(p) => <Textarea {...p} rows={4} value={message} onChange={(e) => { setMessage(e.target.value); setMessageError(false); }} />}
        </Field>
        {actionError && <p role="alert" className="mt-3 text-sm text-coral-600">{actionError}</p>}
      </Modal>

      <Modal
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        title={t('bookings.cancelTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>{t('common.back')}</Button>
            <Button variant="danger" loading={busy} onClick={() => run(() => api.requestCancellation(current.id, { reason: message.trim() || undefined }), t('bookings.cancelDone'))}>
              {t('bookings.cancelSend')}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-700">{cancel.kind === 'withdraw' ? t('bookings.withdrawText') : t('bookings.cancelRequestText')}</p>
        <Field label={t('bookings.cancelReason')} optionalLabel={t('common.optional')}>
          {(p) => <Textarea {...p} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        {actionError && <p role="alert" className="mt-3 text-sm text-coral-600">{actionError}</p>}
      </Modal>
    </Container>
  );
}
