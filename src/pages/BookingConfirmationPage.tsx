import { useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, Copy, MapPin, PartyPopper, Users } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/models';
import { api } from '@/services/api';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { formatSaudiMobile } from '@/utils/phone';
import { ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { DemoNote } from '@/components/common/DemoNote';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { StatusBadge } from '@/components/booking/StatusBadge';

export default function BookingConfirmationPage() {
  const { id = '' } = useParams();
  const { t, l, date, time, num, locale } = useLocale();
  const { eventTypeById, cityById } = useReferenceData();
  const [copied, setCopied] = useState(false);
  const { data, error, loading, reload } = useAsync(async () => {
    const booking = await api.getBooking(id);
    const service = await api.getService(booking.selection.serviceId);
    return { booking, service };
  }, [id]);
  useDocumentTitle(api.isDemo ? t('booking.confirmation.demoTitle') : t('booking.confirmation.title'));

  if (loading && !data) return <LoadingBlock />;
  if (error instanceof ApiError && error.code === 'NOT_FOUND') {
    return <Container className="py-16"><EmptyState title={t('bookings.notFoundTitle')} text={t('bookings.notFoundText')} action={<ButtonLink to="/bookings">{t('nav.myBookings')}</ButtonLink>} /></Container>;
  }
  if (error || !data) return <Container className="py-16"><ErrorState error={error} onRetry={reload} /></Container>;

  const { booking, service } = data;
  const pkg = service.packages.find((p) => p.id === booking.selection.packageId);
  const copy = () => {
    navigator.clipboard?.writeText(booking.reference).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  return (
    <Container className="max-w-4xl py-10">
      <div className="animate-pop rounded-[2rem] bg-white p-6 text-center shadow-lift ring-1 ring-ink-100 sm:p-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-mint-100 text-mint-600">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{api.isDemo ? t('booking.confirmation.demoTitle') : t('booking.confirmation.title')}</h1>
        <p className="mt-2 text-ink-500">{t('booking.confirmation.subtitle', { name: booking.customer.fullName.split(' ')[0] })}</p>

        <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border-2 border-dashed border-plum-200 bg-plum-50 px-8 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-plum-700">{t('booking.confirmation.reference')}</span>
          <span className="mt-1 flex items-center gap-2">
            <span className="ltr-value whitespace-nowrap text-xl font-extrabold tracking-wider text-plum-900 sm:text-2xl">{booking.reference}</span>
            <button type="button" onClick={copy} className="rounded-lg p-1.5 text-plum-700 hover:bg-plum-100" aria-label={copied ? t('common.copied') : t('common.copy')}>
              {copied ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            </button>
          </span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <span className="text-ink-500">{t('booking.confirmation.status')}:</span>
          <StatusBadge status={booking.status} />
        </div>
        {api.isDemo && <DemoNote className="mx-auto mt-6 max-w-xl text-start">{t('booking.confirmation.demoNote')}</DemoNote>}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><PartyPopper className="size-5 text-plum-600" aria-hidden="true" />{l(service.name)}</h2>
          <p className="mb-3 text-sm text-ink-500">{t('booking.package')}: <span className="font-semibold text-ink-900">{l(pkg?.name)}</span></p>
          <ul className="space-y-2 text-sm text-ink-700">
            <li className="flex items-center gap-2"><CalendarDays className="size-4 text-plum-600" aria-hidden="true" />{date(booking.event.date)} · {l(eventTypeById(booking.event.eventTypeId)?.name)}</li>
            <li className="flex items-center gap-2"><Clock className="size-4 text-plum-600" aria-hidden="true" />{time(booking.event.startTime)}</li>
            <li className="flex items-center gap-2"><MapPin className="size-4 text-plum-600" aria-hidden="true" />{booking.event.venue}{locale === 'ar' ? '، ' : ', '}{l(cityById(booking.event.cityId)?.name)}</li>
            <li className="flex items-center gap-2"><Users className="size-4 text-plum-600" aria-hidden="true" />{num(booking.event.attendees)}</li>
          </ul>
          <div className="mt-5 border-t border-ink-100 pt-4 text-sm">
            <p className="font-semibold">{booking.customer.fullName}</p>
            <p className="text-ink-500"><span className="ltr-value">{formatSaudiMobile(booking.customer.phone)}</span> · <span className="ltr-value">{booking.customer.email}</span></p>
          </div>
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
          <h2 className="mb-4 font-bold">{t('booking.priceSummary')}</h2>
          <PriceSummary pricing={booking.pricing} service={service} />
          <p className="mt-3 text-xs text-ink-500">{t('booking.estimateNote')} {t('booking.noPaymentNote')}</p>
        </section>
      </div>

      <section className="mt-6 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
        <h2 className="mb-4 font-bold">{t('booking.confirmation.nextTitle')}</h2>
        <ol className="space-y-3">
          {['next1', 'next2', 'next3'].map((k, i) => (
            <li key={k} className="flex items-start gap-3 text-sm text-ink-700">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-plum-100 text-xs font-bold text-plum-800">{num(i + 1)}</span>
              <span className="pt-1">{t(`booking.confirmation.${k}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to={`/bookings/${booking.id}`} variant="primary" size="lg">{t('booking.confirmation.viewBooking')}</ButtonLink>
        <ButtonLink to="/bookings" variant="outline" size="lg">{t('booking.confirmation.myBookings')}</ButtonLink>
        <ButtonLink to="/services" variant="ghost" size="lg">{t('booking.confirmation.browseMore')}</ButtonLink>
      </div>
    </Container>
  );
}
