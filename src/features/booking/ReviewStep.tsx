import { useState } from 'react';
import { AlertCircle, Pencil } from 'lucide-react';
import type { PricingBreakdown, Service } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { formatSaudiMobile } from '@/utils/phone';
import { DemoNote } from '@/components/common/DemoNote';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { StepActions } from './StepActions';
import type { BookingDraft } from './useBookingDraft';

function Block({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-sm font-semibold text-plum-700 hover:underline">
          <Pencil className="size-3.5" aria-hidden="true" />
          {t('booking.edit')}
        </button>
      </div>
      {children}
    </section>
  );
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-1.5 text-sm">
    <dt className="text-ink-500">{label}</dt>
    <dd className="font-medium text-ink-900">{value}</dd>
  </div>
);

export function ReviewStep({
  service,
  draft,
  pricing,
  goTo,
  onSubmit,
  submitting,
  submitError,
}: {
  service: Service;
  draft: BookingDraft;
  pricing: PricingBreakdown;
  goTo: (step: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError?: string;
}) {
  const { t, l, date, time, num, money } = useLocale();
  const { eventTypeById, cityById } = useReferenceData();
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const pkg = service.packages.find((p) => p.id === draft.packageId);
  const { event, customer } = draft;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return; // guard against double submit
        if (!agreed) return setAgreeError(true);
        onSubmit();
      }}
      noValidate
    >
      <h2 className="text-xl font-bold">{t('booking.reviewTitle')}</h2>
      <p className="mb-6 mt-1 text-sm text-ink-500">{t('booking.reviewHint')}</p>

      <div className="space-y-4">
        <Block title={t('booking.service')} onEdit={() => goTo(0)}>
          <dl>
            <Row label={t('booking.service')} value={l(service.name)} />
            <Row label={t('booking.package')} value={`${l(pkg?.name)} · ${money(pkg?.price ?? 0)}`} />
          </dl>
        </Block>
        <Block title={t('booking.eventDetails')} onEdit={() => goTo(1)}>
          <dl>
            <Row label={t('booking.eventType')} value={l(eventTypeById(event.eventTypeId)?.name)} />
            <Row label={t('booking.date')} value={date(event.date)} />
            <Row label={t('booking.startTime')} value={time(event.startTime)} />
            {event.extraHours > 0 && <Row label={t('booking.extraHours')} value={num(event.extraHours)} />}
            <Row label={t('booking.city')} value={l(cityById(event.cityId)?.name)} />
            <Row label={t('booking.venue')} value={event.venue} />
            <Row label={t('booking.attendees')} value={num(Number(event.attendees))} />
            {event.notes && <Row label={t('booking.notes')} value={event.notes} />}
          </dl>
        </Block>
        <Block title={t('booking.addOnsTitle')} onEdit={() => goTo(2)}>
          {draft.addOns.length === 0 ? (
            <p className="text-sm text-ink-500">—</p>
          ) : (
            <dl>
              {draft.addOns.map((a) => {
                const addOn = service.addOns.find((x) => x.id === a.addOnId);
                return <Row key={a.addOnId} label={l(addOn?.name)} value={`${num(a.quantity)} × ${money(addOn?.price ?? 0)}`} />;
              })}
            </dl>
          )}
        </Block>
        <Block title={t('booking.contactDetails')} onEdit={() => goTo(3)}>
          <dl>
            <Row label={t('booking.fullName')} value={customer.fullName} />
            <Row label={t('booking.phone')} value={<span className="ltr-value">{formatSaudiMobile(customer.phone)}</span>} />
            <Row label={t('booking.email')} value={<span className="ltr-value">{customer.email}</span>} />
            <Row label={t('booking.contactMethod')} value={t(`booking.contactMethods.${customer.contactMethod}`)} />
          </dl>
        </Block>
        <section className="rounded-2xl border-2 border-plum-200 bg-plum-50/40 p-5 lg:hidden">
          <h3 className="mb-3 font-bold">{t('booking.priceSummary')}</h3>
          <PriceSummary pricing={pricing} service={service} />
        </section>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-sand-100 p-4 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-plum-700" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setAgreeError(false); }} aria-invalid={agreeError || undefined} />
        <span>{t('booking.agree')}</span>
      </label>
      {agreeError && <p role="alert" className="mt-2 text-sm font-medium text-coral-600">{t('booking.agreeRequired')}</p>}

      {submitError && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-coral-500/30 bg-coral-100 px-4 py-3 text-sm font-medium text-coral-600">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {submitError}
        </p>
      )}
      <DemoNote className="mt-4">{t('booking.confirmation.demoNote')}</DemoNote>

      <StepActions onBack={() => goTo(3)} nextLabel={submitting ? t('booking.submitting') : t('booking.submit')} loading={submitting} />
    </form>
  );
}
