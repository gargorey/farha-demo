import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, Wand2 } from 'lucide-react';
import type { AudienceAge, EntertainmentStyle } from '@/models';
import { api } from '@/services/api';
import { businessConfig } from '@/config/business';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { searchContext } from '@/features/event-discovery/search-context';
import { addDays, todayISO } from '@/utils/dates';
import { recommendServices, type PlannerInput } from '@/utils/recommend';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button, ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { Field, Input, Select } from '@/components/common/Field';
import { ArrowForward } from '@/components/common/Icons';
import { SmartImage } from '@/components/common/SmartImage';
import { StarRating } from '@/components/common/StarRating';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/StateViews';
import { cn } from '@/components/common/cn';

const AUDIENCES: AudienceAge[] = ['toddlers', 'kids', 'teens', 'adults', 'all'];
const STYLES: EntertainmentStyle[] = ['calm', 'interactive', 'high-energy', 'educational', 'elegant'];
const DURATIONS = ['45', '60', '120', '180'] as const;

interface FormState {
  eventTypeId: string;
  date: string;
  cityId: string;
  attendees: string;
  audience: '' | AudienceAge;
  budget: string;
  style: '' | EntertainmentStyle;
  duration: string;
}

function Chips<T extends string>({ value, options, onChange, label }: { value: T | ''; options: readonly T[]; onChange: (v: T | '') => void; label: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(value === o ? '' : o)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
            value === o ? 'border-plum-700 bg-plum-800 text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-plum-200',
          )}
        >
          {value === o && <Check className="size-3.5" aria-hidden="true" />}
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export default function PlannerPage() {
  const { t, l, money } = useLocale();
  const { eventTypes, cities } = useReferenceData();
  useDocumentTitle(t('planner.title'));
  const ctx = searchContext.get();
  const [form, setForm] = useState<FormState>({
    eventTypeId: ctx.eventTypeId ?? '',
    date: ctx.date ?? '',
    cityId: ctx.cityId ?? '',
    attendees: ctx.attendees ? String(ctx.attendees) : '',
    audience: '',
    budget: '',
    style: '',
    duration: '',
  });
  const [submitted, setSubmitted] = useState<PlannerInput | null>(null);
  const { data, error, loading, reload } = useAsync(() => api.listServices(), []);

  const results = useMemo(() => (data && submitted ? recommendServices(data.items, submitted) : []), [data, submitted]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: PlannerInput = {
      eventTypeId: form.eventTypeId || undefined,
      cityId: form.cityId || undefined,
      date: form.date || undefined,
      attendees: form.attendees ? Number(form.attendees) : undefined,
      audience: form.audience || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      style: form.style || undefined,
      durationMinutes: form.duration ? Number(form.duration) : undefined,
    };
    searchContext.merge({ eventTypeId: input.eventTypeId, cityId: input.cityId, date: input.date, attendees: input.attendees });
    setSubmitted(input);
    requestAnimationFrame(() => document.getElementById('planner-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('planner.title') }]} />
      <div className="grid gap-10 lg:grid-cols-[26rem_1fr]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('planner.title')}</h1>
          <p className="mt-2 text-ink-500">{t('planner.subtitle')}</p>
          <form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
            <Field label={t('planner.eventType')}>
              {(p) => (
                <Select {...p} value={form.eventTypeId} onChange={(e) => set('eventTypeId', e.target.value)}>
                  <option value="">{t('home.anyEventType')}</option>
                  {eventTypes.map((et) => <option key={et.id} value={et.id}>{l(et.name)}</option>)}
                </Select>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('planner.date')}>
                {(p) => <Input {...p} type="date" min={addDays(todayISO(), businessConfig.booking.minLeadDays)} value={form.date} onChange={(e) => set('date', e.target.value)} />}
              </Field>
              <Field label={t('planner.city')}>
                {(p) => (
                  <Select {...p} value={form.cityId} onChange={(e) => set('cityId', e.target.value)}>
                    <option value="">{t('home.anyCity')}</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={t('planner.attendees')}>
                {(p) => <Input {...p} type="number" inputMode="numeric" min={1} max={businessConfig.booking.maxAttendees} value={form.attendees} onChange={(e) => set('attendees', e.target.value)} />}
              </Field>
              <Field label={t('planner.budget')}>
                {(p) => <Input {...p} type="number" inputMode="numeric" min={0} step={100} value={form.budget} onChange={(e) => set('budget', e.target.value)} />}
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-700">{t('planner.audience')}</legend>
              <Chips value={form.audience} options={AUDIENCES} onChange={(v) => set('audience', v)} label={(v) => t(`audience.${v}`)} />
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-700">{t('planner.style')}</legend>
              <Chips value={form.style} options={STYLES} onChange={(v) => set('style', v)} label={(v) => t(`style.${v}`)} />
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-700">{t('planner.duration')}</legend>
              <Chips value={form.duration as (typeof DURATIONS)[number] | ''} options={DURATIONS} onChange={(v) => set('duration', v)} label={(v) => t(`planner.durationOptions.${v}`)} />
            </fieldset>
            <Button type="submit" variant="primary" size="lg" className="w-full" icon={<Wand2 className="size-4" aria-hidden="true" />}>
              {t('planner.find')}
            </Button>
          </form>
        </div>

        <section id="planner-results" className="scroll-mt-24" aria-live="polite">
          {error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : loading ? (
            <LoadingBlock />
          ) : !submitted ? (
            <EmptyState icon={<Wand2 className="size-7" aria-hidden="true" />} title={t('planner.start')} text={t('planner.subtitle')} className="h-full justify-center" />
          ) : results.length === 0 ? (
            <EmptyState title={t('planner.emptyTitle')} text={t('planner.emptyText')} action={<ButtonLink to="/services" variant="outline">{t('home.ctaSecondary')}</ButtonLink>} />
          ) : (
            <div>
              <h2 className="text-2xl font-bold">{t('planner.resultsTitle', { count: results.length })}</h2>
              <p className="mt-1 text-sm text-ink-500">{t('planner.resultsHint')}</p>
              <ol className="mt-6 space-y-4">
                {results.slice(0, 8).map(({ service, reasons }, i) => (
                  <li key={service.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <article className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100 sm:flex-row">
                      <SmartImage media={service.media[0]} seed={i + 2} className="aspect-[4/3] w-full shrink-0 rounded-2xl sm:w-48" decorative />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-lg font-bold">
                            <Link to={`/services/${service.slug}`} className="hover:text-plum-700">{l(service.name)}</Link>
                          </h3>
                          <span className="text-sm text-ink-500">{t('common.startingFrom')} <span className="text-lg font-extrabold text-plum-800">{money(service.startingPrice)}</span></span>
                        </div>
                        <StarRating rating={service.rating} count={service.reviewCount} className="mt-1 text-sm" />
                        <p className="mt-2 line-clamp-2 text-sm text-ink-500">{l(service.shortDescription)}</p>
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {reasons.map((r) => (
                            <li key={r} className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-1 text-xs font-semibold text-mint-600">
                              <Check className="size-3" aria-hidden="true" />
                              {t(`planner.reasons.${r}`)}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap gap-2 sm:mt-auto sm:pt-4">
                          <ButtonLink to={`/book/${service.slug}`} variant="primary" size="sm">{t('planner.bookWithDetails')}</ButtonLink>
                          <ButtonLink to={`/services/${service.slug}`} variant="ghost" size="sm">{t('common.viewDetails')}<ArrowForward className="size-4" /></ButtonLink>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}
