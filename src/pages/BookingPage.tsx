import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { ApiError, type Service } from '@/models';
import { api } from '@/services/api';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { searchContext } from '@/features/event-discovery/search-context';
import { ContactStep } from '@/features/booking/ContactStep';
import { CustomizeStep } from '@/features/booking/CustomizeStep';
import { EventStep } from '@/features/booking/EventStep';
import { PackageStep } from '@/features/booking/PackageStep';
import { ReviewStep } from '@/features/booking/ReviewStep';
import { Stepper } from '@/features/booking/Stepper';
import { dateIssue } from '@/features/booking/schemas';
import { emptyDraft, useBookingDraft, type BookingDraft } from '@/features/booking/useBookingDraft';
import { calculatePricing } from '@/utils/pricing';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { SmartImage } from '@/components/common/SmartImage';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { PriceSummary } from '@/components/booking/PriceSummary';

function BookingWizard({ service, initialPackage }: { service: Service; initialPackage?: string }) {
  const { t, l, date, num } = useLocale();
  const { cityById } = useReferenceData();
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);

  const init = useCallback((): BookingDraft => {
    const ctx = searchContext.get();
    return emptyDraft(service.id, {
      packageId: service.packages.some((p) => p.id === initialPackage) ? initialPackage : undefined,
      eventTypeId: ctx.eventTypeId && service.eventTypeIds.includes(ctx.eventTypeId) ? ctx.eventTypeId : '',
      cityId: ctx.cityId && service.cityIds.includes(ctx.cityId) ? ctx.cityId : '',
      date: ctx.date && !dateIssue(ctx.date) ? ctx.date : '',
      attendees: ctx.attendees ?? '',
    });
  }, [service, initialPackage]);

  const { draft, update, clear } = useBookingDraft(service.id, init);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const pricing = useMemo(
    () =>
      draft.packageId
        ? calculatePricing({
            service,
            packageId: draft.packageId,
            addOns: draft.addOns,
            extraHours: draft.event.extraHours,
            city: cityById(draft.event.cityId),
          })
        : null,
    [service, draft.packageId, draft.addOns, draft.event.extraHours, draft.event.cityId, cityById],
  );

  const goTo = (step: number, patch: Partial<BookingDraft> = {}) => {
    // Editing after a failed attempt makes it a new request, so it gets a new idempotency key.
    const key = submitError ? { idempotencyKey: crypto.randomUUID() } : {};
    if (submitError) setSubmitError(undefined);
    update({ ...patch, ...key, step });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    if (submitting || !pricing) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const booking = await api.createBooking({
        selection: { serviceId: service.id, packageId: draft.packageId, addOns: draft.addOns },
        event: { ...draft.event, attendees: Number(draft.event.attendees), notes: draft.event.notes || undefined },
        customer: draft.customer,
        idempotencyKey: draft.idempotencyKey,
      });
      clear();
      navigate(`/booking/confirmation/${booking.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DATE_UNAVAILABLE') setSubmitError(t('booking.dateUnavailableError'));
      else setSubmitError(t('booking.submitError'));
      setSubmitting(false);
    }
  };

  const pkg = service.packages.find((p) => p.id === draft.packageId);
  const step = Math.min(draft.step, pkg ? 4 : 0);

  return (
    <div ref={topRef} className="scroll-mt-24">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">{t('booking.title', { service: l(service.name) })}</h1>
      <div className="mb-8 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
        <Stepper current={step} onSelect={(i) => goTo(i)} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-ink-100 sm:p-7">
          {step === 0 && <PackageStep service={service} value={draft.packageId} onNext={(packageId) => goTo(1, { packageId })} />}
          {step === 1 && (
            <EventStep
              service={service}
              draft={draft}
              onBack={(event) => goTo(0, { event: { ...draft.event, ...event } })}
              onNext={(values) => {
                searchContext.merge({ eventTypeId: values.eventTypeId, cityId: values.cityId, date: values.date, attendees: values.attendees });
                goTo(2, { event: { ...values, notes: values.notes ?? '' } });
              }}
            />
          )}
          {step === 2 && <CustomizeStep service={service} value={draft.addOns} onChange={(addOns) => update({ addOns })} onBack={() => goTo(1)} onNext={() => goTo(3)} />}
          {step === 3 && <ContactStep value={draft.customer} onBack={(customer) => goTo(2, { customer: { ...draft.customer, ...customer } })} onNext={(customer) => goTo(4, { customer })} />}
          {step === 4 && pricing && (
            <ReviewStep service={service} draft={draft} pricing={pricing} goTo={goTo} onSubmit={submit} submitting={submitting} submitError={submitError} />
          )}
        </div>

        <aside aria-label={t('booking.summaryTitle')} className="order-first lg:order-none">
          <div className="sticky top-24 overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-ink-100">
            <div className="flex items-center gap-3 border-b border-ink-100 p-4">
              <SmartImage media={service.media[0]} className="size-16 shrink-0 rounded-xl" decorative />
              <div className="min-w-0">
                <p className="truncate font-bold">{l(service.name)}</p>
                {pkg && <p className="text-sm text-ink-500">{l(pkg.name)}</p>}
              </div>
            </div>
            {(draft.event.date || draft.event.cityId || draft.event.attendees) && (
              <ul className="space-y-1.5 border-b border-ink-100 p-4 text-sm text-ink-700">
                {draft.event.date && <li className="flex items-center gap-2"><CalendarDays className="size-4 text-plum-600" aria-hidden="true" />{date(draft.event.date, 'medium')}</li>}
                {draft.event.cityId && <li className="flex items-center gap-2"><MapPin className="size-4 text-plum-600" aria-hidden="true" />{l(cityById(draft.event.cityId)?.name)}</li>}
                {draft.event.attendees !== '' && <li className="flex items-center gap-2"><Users className="size-4 text-plum-600" aria-hidden="true" />{num(Number(draft.event.attendees))}</li>}
              </ul>
            )}
            <div className="hidden p-4 lg:block">
              {pricing ? <PriceSummary pricing={pricing} service={service} compact /> : <p className="text-sm text-ink-500">{t('booking.choosePackage')}</p>}
              <p className="mt-3 text-xs text-ink-500">{t('booking.estimateNote')} {t('booking.noPaymentNote')}</p>
            </div>
            {pricing && (
              <div className="flex items-center justify-between p-4 lg:hidden">
                <span className="text-sm font-semibold">{t('pricing.estimated')}</span>
                <PriceTotal amount={pricing.total} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PriceTotal({ amount }: { amount: number }) {
  const { money } = useLocale();
  return <span className="text-xl font-extrabold text-plum-800">{money(amount)}</span>;
}

export default function BookingPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const { t, l } = useLocale();
  const { data: service, error, loading, reload } = useAsync(() => api.getService(slug), [slug]);
  useDocumentTitle(service ? t('booking.title', { service: l(service.name) }) : t('booking.pageTitle'));

  return (
    <Container className="py-8">
      <Breadcrumbs
        items={[
          { label: t('nav.home'), to: '/' },
          { label: t('nav.services'), to: '/services' },
          ...(service ? [{ label: l(service.name), to: `/services/${service.slug}` }] : []),
          { label: t('booking.pageTitle') },
        ]}
      />
      {loading && !service ? (
        <LoadingBlock />
      ) : error instanceof ApiError && error.code === 'NOT_FOUND' ? (
        <EmptyState title={t('service.notFoundTitle')} text={t('booking.notFound')} action={<ButtonLink to="/services">{t('nav.services')}</ButtonLink>} />
      ) : error || !service ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <BookingWizard key={service.id} service={service} initialPackage={params.get('package') ?? undefined} />
      )}
    </Container>
  );
}
