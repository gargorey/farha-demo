import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CalendarCheck2, CalendarClock, CalendarX2, HelpCircle, Minus, Plus } from 'lucide-react';
import type { AvailabilityState, DayAvailability, Service } from '@/models';
import { api } from '@/services/api';
import { businessConfig } from '@/config/business';
import { useAsync } from '@/hooks/useAsync';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { addDays, todayISO } from '@/utils/dates';
import { Field, Input, Select, Textarea } from '@/components/common/Field';
import { Spinner } from '@/components/common/Spinner';
import { cn } from '@/components/common/cn';
import { dateIssue, eventSchema, type EventFormValues } from './schemas';
import { StepActions } from './StepActions';
import { useFieldError } from './useFieldError';
import type { BookingDraft } from './useBookingDraft';

const stateStyle: Record<AvailabilityState, { cls: string; Icon: typeof CalendarCheck2 }> = {
  available: { cls: 'border-mint-600/30 bg-mint-100 text-mint-600', Icon: CalendarCheck2 },
  limited: { cls: 'border-gold-500/30 bg-gold-100 text-gold-600', Icon: CalendarClock },
  unavailable: { cls: 'border-coral-500/30 bg-coral-100 text-coral-600', Icon: CalendarX2 },
  unverified: { cls: 'border-ink-300/50 bg-ink-100 text-ink-700', Icon: HelpCircle },
};

function AvailabilityStrip({ days, selected, onPick }: { days: DayAvailability[]; selected: string; onPick: (d: string) => void }) {
  const { t, locale } = useLocale();
  const dot: Record<AvailabilityState, string> = { available: 'bg-mint-600', limited: 'bg-gold-500', unavailable: 'bg-coral-500', unverified: 'bg-ink-300' };
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-ink-500">{t('booking.availability.legend')}</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const date = new Date(`${d.date}T12:00:00`);
          const disabled = d.state === 'unavailable';
          return (
            <button
              key={d.date}
              type="button"
              disabled={disabled}
              onClick={() => onPick(d.date)}
              aria-pressed={selected === d.date}
              aria-label={`${new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { dateStyle: 'full', calendar: 'gregory' }).format(date)} – ${t(`booking.availability.${d.state}`)}`}
              className={cn(
                'flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 text-center transition-colors',
                selected === d.date ? 'border-plum-700 bg-plum-800 text-white' : 'border-ink-100 bg-white hover:border-plum-200',
                disabled && 'cursor-not-allowed opacity-40 line-through',
              )}
            >
              <span className="text-[10px] font-medium uppercase opacity-80">
                {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { weekday: 'short', calendar: 'gregory' }).format(date)}
              </span>
              <span className="text-lg font-bold leading-tight">{new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { day: 'numeric', calendar: 'gregory' }).format(date)}</span>
              <span className={cn('mt-1 size-1.5 rounded-full', dot[d.state])} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EventStep({ service, draft, onBack, onNext }: { service: Service; draft: BookingDraft; onBack: (v: BookingDraft['event']) => void; onNext: (v: EventFormValues) => void }) {
  const { t, l, money, num, time } = useLocale();
  const { eventTypeById, cityById } = useReferenceData();
  const fieldError = useFieldError();
  const today = todayISO();
  const { minLeadDays, maxAdvanceDays, defaultStartTimes } = businessConfig.booking;

  const schema = useMemo(() => eventSchema(service), [service]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    control,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: draft.event as unknown as EventFormValues,
    mode: 'onTouched',
  });

  const date = watch('date');
  const attendees = Number(watch('attendees'));
  const pkg = service.packages.find((p) => p.id === draft.packageId);
  const validDate = date && !dateIssue(date) ? date : '';

  // Availability for the next 14 bookable days (strip) and the chosen date.
  const stripFrom = addDays(today, minLeadDays);
  const strip = useAsync(() => api.getAvailability({ serviceId: service.id, from: stripFrom, to: addDays(stripFrom, 13) }), [service.id, stripFrom]);
  const selected = useAsync(
    () => (validDate ? api.getAvailability({ serviceId: service.id, from: validDate, to: validDate }).then((r) => r[0]) : Promise.resolve(undefined)),
    [service.id, validDate],
  );
  const availability = selected.data;
  const slots = useMemo(() => (availability?.slots.length ? availability.slots : [...defaultStartTimes]), [availability, defaultStartTimes]);

  const startTime = watch('startTime');
  useEffect(() => {
    if (availability && startTime && !slots.includes(startTime)) setValue('startTime', '');
  }, [availability, slots, startTime, setValue]);

  const submit = handleSubmit((values) => {
    if (availability?.state === 'unavailable') {
      setError('date', { message: 'validation.dateUnavailable' });
      return;
    }
    onNext(values);
  });

  const extraHours = Number(watch('extraHours') ?? 0);

  return (
    <form onSubmit={submit} noValidate>
      <h2 className="mb-6 text-xl font-bold">{t('booking.steps.event')}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('booking.eventType')} required error={fieldError(errors.eventTypeId)} className="sm:col-span-2">
          {(p) => (
            <Select {...p} {...register('eventTypeId')}>
              <option value="">{t('booking.selectEventType')}</option>
              {service.eventTypeIds.map((id) => <option key={id} value={id}>{l(eventTypeById(id)?.name)}</option>)}
            </Select>
          )}
        </Field>

        <div className="space-y-3 sm:col-span-2">
          {strip.data && (
            <AvailabilityStrip days={strip.data} selected={date} onPick={(d) => setValue('date', d, { shouldValidate: true, shouldTouch: true })} />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('booking.date')} required error={fieldError(errors.date)}>
              {(p) => <Input {...p} type="date" min={addDays(today, minLeadDays)} max={addDays(today, maxAdvanceDays)} {...register('date')} />}
            </Field>
            <Field label={t('booking.startTime')} required error={fieldError(errors.startTime)}>
              {(p) => (
                <Select {...p} {...register('startTime')}>
                  <option value="">{t('booking.selectTime')}</option>
                  {slots.map((s) => <option key={s} value={s}>{time(s)}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <div aria-live="polite">
            {!validDate ? (
              <p className="text-sm text-ink-500">{t('booking.availability.pickDate')}</p>
            ) : selected.loading ? (
              <p className="flex items-center gap-2 text-sm text-ink-500"><Spinner className="size-4" />{t('booking.availability.checking')}</p>
            ) : availability ? (
              (() => {
                const { cls, Icon } = stateStyle[availability.state];
                return (
                  <p className={cn('flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium', cls)}>
                    <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {t(`booking.availability.${availability.state}`)}
                  </p>
                );
              })()
            ) : null}
          </div>
        </div>

        {service.maxExtraHours > 0 && service.extraHourPrice != null && (
          <Controller
            control={control}
            name="extraHours"
            render={({ field }) => (
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-ink-700">{t('booking.extraHours')} <span className="text-xs font-normal text-ink-500">({t('common.optional')})</span></p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="inline-flex items-center rounded-full border border-ink-100 bg-white">
                    <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-sand-100 disabled:opacity-40" disabled={extraHours <= 0} onClick={() => field.onChange(extraHours - 1)} aria-label={t('booking.decrease', { name: t('booking.extraHours') })}><Minus className="size-4" aria-hidden="true" /></button>
                    <span className="w-8 text-center font-bold" aria-live="polite">{num(extraHours)}</span>
                    <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-sand-100 disabled:opacity-40" disabled={extraHours >= service.maxExtraHours} onClick={() => field.onChange(extraHours + 1)} aria-label={t('booking.increase', { name: t('booking.extraHours') })}><Plus className="size-4" aria-hidden="true" /></button>
                  </div>
                  <span className="text-xs text-ink-500">{t('booking.extraHoursHint', { price: money(service.extraHourPrice!), max: num(service.maxExtraHours) })}</span>
                </div>
              </div>
            )}
          />
        )}

        <Field label={t('booking.city')} required error={fieldError(errors.cityId)} hint={t('booking.cityNotServedHint')}>
          {(p) => (
            <Select {...p} {...register('cityId')}>
              <option value="">{t('booking.selectCity')}</option>
              {service.cityIds.map((id) => {
                const c = cityById(id);
                return <option key={id} value={id}>{l(c?.name)}{c && c.travelFee > 0 ? ` (+${money(c.travelFee)})` : ''}</option>;
              })}
            </Select>
          )}
        </Field>
        <Field label={t('booking.attendees')} required error={fieldError(errors.attendees)}>
          {(p) => <Input {...p} type="number" inputMode="numeric" min={1} {...register('attendees')} />}
        </Field>
        {pkg && attendees > pkg.maxAttendees && (
          <p className="flex items-start gap-2 rounded-xl bg-gold-100 px-3.5 py-2.5 text-sm text-gold-600 sm:col-span-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('booking.capacityWarning', { max: num(pkg.maxAttendees) })}
          </p>
        )}
        <Field label={t('booking.venue')} required error={fieldError(errors.venue)} className="sm:col-span-2">
          {(p) => <Input {...p} placeholder={t('booking.venuePlaceholder')} autoComplete="street-address" {...register('venue')} />}
        </Field>
        <Field label={t('booking.notes')} optionalLabel={t('common.optional')} className="sm:col-span-2">
          {(p) => <Textarea {...p} rows={3} placeholder={t('booking.notesPlaceholder')} {...register('notes')} />}
        </Field>
      </div>
      <StepActions onBack={() => onBack(getValues() as unknown as BookingDraft['event'])} />
    </form>
  );
}
