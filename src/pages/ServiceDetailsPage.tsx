import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Baby, CalendarCheck, Check, Clock, ClipboardList, MapPin, PartyPopper, Plus, Sparkles, Users } from 'lucide-react';
import { ApiError, type Service } from '@/models';
import { api } from '@/services/api';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Accordion } from '@/components/common/Accordion';
import { Badge } from '@/components/common/Badge';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { DemoNote } from '@/components/common/DemoNote';
import { SmartImage } from '@/components/common/SmartImage';
import { Skeleton } from '@/components/common/Spinner';
import { Stars, StarRating } from '@/components/common/StarRating';
import { EmptyState, ErrorState } from '@/components/common/StateViews';
import { cn } from '@/components/common/cn';
import { ServiceCard } from '@/components/services/ServiceCard';

function Gallery({ service }: { service: Service }) {
  const { t } = useLocale();
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="overflow-hidden rounded-3xl shadow-soft">
        <SmartImage media={service.media[active]} seed={active + 3} className="aspect-[16/10] w-full" />
      </div>
      {service.media.length > 1 && (
        <div className="mt-3 flex gap-3" role="group" aria-label={t('service.gallery')}>
          {service.media.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t('service.showImage', { n: i + 1 })}
              aria-pressed={active === i}
              className={cn('overflow-hidden rounded-xl ring-2 transition', active === i ? 'ring-plum-700' : 'ring-transparent opacity-70 hover:opacity-100')}
            >
              <SmartImage media={m} seed={i + 3} className="h-16 w-24 sm:h-20 sm:w-28" decorative />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100 sm:p-7">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ServiceDetailsPage() {
  const { slug = '' } = useParams();
  const { t, l, money, duration, date, num, locale } = useLocale();
  const { categoryById, eventTypeById, cityById } = useReferenceData();
  const { data: service, error, loading, reload } = useAsync(() => api.getService(slug), [slug]);
  const { data: catalog } = useAsync(() => api.listServices({ sort: 'popularity' }), []);
  useDocumentTitle(service ? l(service.name) : undefined);

  if (loading && !service) {
    return (
      <Container className="py-8">
        <Skeleton className="mb-6 h-5 w-64" />
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="aspect-[16/10] rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </Container>
    );
  }
  if (error instanceof ApiError && error.code === 'NOT_FOUND') {
    return (
      <Container className="py-16">
        <EmptyState title={t('service.notFoundTitle')} text={t('service.notFoundText')} action={<ButtonLink to="/services">{t('nav.services')}</ButtonLink>} />
      </Container>
    );
  }
  if (error || !service) return <Container className="py-16"><ErrorState error={error} onRetry={reload} /></Container>;

  const category = categoryById(service.categoryId);
  // Same category first, then services sharing the most event types.
  const similarServices = (catalog?.items ?? [])
    .filter((s) => s.id !== service.id)
    .map((s) => ({
      s,
      score: (s.categoryId === service.categoryId ? 10 : 0) + s.eventTypeIds.filter((e) => service.eventTypeIds.includes(e)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ s }) => s);
  const age = service.ageRange.min === 0 && !service.ageRange.max
    ? t('common.allAges')
    : service.ageRange.max
      ? t('common.ageRange', { min: num(service.ageRange.min), max: num(service.ageRange.max) })
      : t('common.ageFrom', { min: num(service.ageRange.min) });

  const facts = [
    { Icon: Clock, label: t('service.duration'), value: `${duration(service.durationMinutes)} – ${duration(Math.max(...service.packages.map((p) => p.durationMinutes)))}` },
    { Icon: Baby, label: t('service.age'), value: age },
    { Icon: Users, label: t('booking.attendees'), value: t('common.upTo', { count: Math.max(...service.packages.map((p) => p.maxAttendees)) }) },
    { Icon: Sparkles, label: t('service.styles'), value: service.styles.map((s) => t(`style.${s}`)).join(locale === 'ar' ? '، ' : ', ') },
  ];

  return (
    <div className="pb-24 lg:pb-0">
      <Container className="py-8">
        <Breadcrumbs
          items={[
            { label: t('nav.home'), to: '/' },
            { label: t('nav.services'), to: '/services' },
            ...(category ? [{ label: l(category.name), to: `/services?category=${category.id}` }] : []),
            { label: l(service.name) },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-6">
            <Gallery service={service} />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                {category && <Badge tone="plum">{l(category.name)}</Badge>}
                {service.featured && <Badge tone="gold">{t('common.featured')}</Badge>}
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{l(service.name)}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
                <StarRating rating={service.rating} count={service.reviewCount} />
                <span>{t('service.provider')}: <span className="font-semibold text-ink-700">{l(service.providerName)}</span></span>
                <span>{t('common.bookings', { count: service.bookingsCount })}</span>
              </div>
              <p className="mt-5 text-lg leading-relaxed text-ink-700">{l(service.description)}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {facts.map(({ Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-100">
                  <Icon className="size-5 text-plum-600" aria-hidden="true" />
                  <dt className="mt-2 text-xs text-ink-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            <Section title={t('service.packages')} icon={<PartyPopper className="size-5 text-plum-600" aria-hidden="true" />}>
              <div className="grid gap-4 md:grid-cols-2">
                {service.packages.map((p) => (
                  <div key={p.id} className={cn('relative flex flex-col rounded-2xl border p-5', p.popular ? 'border-plum-600 bg-plum-50/50' : 'border-ink-100')}>
                    {p.popular && <Badge tone="plum" className="absolute -top-2.5 start-4 bg-plum-800 text-white">{t('common.popular')}</Badge>}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold">{l(p.name)}</h3>
                      <span className="text-lg font-extrabold text-plum-800">{money(p.price)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">{l(p.description)}</p>
                    <p className="mt-2 flex flex-wrap gap-x-4 text-xs font-medium text-ink-500">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{duration(p.durationMinutes)}</span>
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden="true" />{t('service.maxAttendees', { count: p.maxAttendees })}</span>
                    </p>
                    <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                      {p.includes.map((inc, i) => (
                        <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-mint-600" aria-hidden="true" />{l(inc)}</li>
                      ))}
                    </ul>
                    <ButtonLink to={`/book/${service.slug}?package=${p.id}`} variant={p.popular ? 'primary' : 'outline'} className="mt-5 w-full">
                      {t('service.selectPackage', { name: l(p.name) })}
                    </ButtonLink>
                  </div>
                ))}
              </div>
              {service.extraHourPrice != null && service.maxExtraHours > 0 && (
                <p className="mt-4 text-sm text-ink-500">{t('service.extraHour', { price: money(service.extraHourPrice) })}</p>
              )}
            </Section>

            {service.addOns.length > 0 && (
              <Section title={t('service.addOns')} icon={<Plus className="size-5 text-plum-600" aria-hidden="true" />}>
                <ul className="divide-y divide-ink-100">
                  {service.addOns.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold">{l(a.name)}</p>
                        <p className="text-sm text-ink-500">{l(a.description)}</p>
                      </div>
                      <span className="shrink-0 font-bold text-plum-800">
                        {money(a.price)}
                        {a.quantifiable && <span className="ms-1 text-xs font-normal text-ink-500">{t('service.perUnit')}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Section title={t('service.eventTypes')} icon={<CalendarCheck className="size-5 text-plum-600" aria-hidden="true" />}>
                <div className="flex flex-wrap gap-2">
                  {service.eventTypeIds.map((id) => (
                    <Link key={id} to={`/services?event=${id}`} className="rounded-full bg-sand-100 px-3 py-1.5 text-sm font-medium hover:bg-plum-100">{l(eventTypeById(id)?.name)}</Link>
                  ))}
                </div>
              </Section>
              <Section title={t('service.areas')} icon={<MapPin className="size-5 text-plum-600" aria-hidden="true" />}>
                <div className="flex flex-wrap gap-2">
                  {service.cityIds.map((id) => (
                    <span key={id} className="rounded-full bg-sand-100 px-3 py-1.5 text-sm font-medium">{l(cityById(id)?.name)}</span>
                  ))}
                </div>
              </Section>
            </div>

            <Section title={t('service.requirements')} icon={<ClipboardList className="size-5 text-plum-600" aria-hidden="true" />}>
              <ul className="space-y-2">
                {service.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-ink-700"><Check className="mt-1 size-4 shrink-0 text-plum-600" aria-hidden="true" />{l(r)}</li>
                ))}
              </ul>
            </Section>

            <Section title={t('service.reviewsTitle')}>
              <DemoNote className="mb-5">{t('service.reviewsNote')}</DemoNote>
              <div className="space-y-5">
                {service.reviews.map((r) => (
                  <article key={r.id} className="border-b border-ink-100 pb-5 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-full bg-plum-100 font-bold text-plum-800">{l(r.author).charAt(0)}</span>
                        <div>
                          <p className="font-semibold">{l(r.author)}</p>
                          <p className="text-xs text-ink-500">{l(eventTypeById(r.eventType)?.name)} · {date(r.date, 'medium')}</p>
                        </div>
                      </div>
                      <Stars value={r.rating} />
                    </div>
                    <p className="mt-3 text-ink-700">{l(r.comment)}</p>
                  </article>
                ))}
              </div>
            </Section>

            <Section title={t('service.faqTitle')}>
              <Accordion items={service.faqs.map((f, i) => ({ id: String(i), question: l(f.question), answer: l(f.answer) }))} />
            </Section>
          </div>

          {/* Booking sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl bg-white p-6 shadow-lift ring-1 ring-ink-100">
              <p className="text-sm text-ink-500">{t('common.startingFrom')}</p>
              <p className="text-3xl font-extrabold text-plum-800">{money(service.startingPrice)}</p>
              <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
                <li className="flex items-center gap-2"><Clock className="size-4 text-plum-600" aria-hidden="true" />{duration(service.durationMinutes)}+</li>
                <li className="flex items-center gap-2"><MapPin className="size-4 text-plum-600" aria-hidden="true" />{service.cityIds.slice(0, 3).map((c) => l(cityById(c)?.name)).join(locale === 'ar' ? '، ' : ', ')}{service.cityIds.length > 3 ? ' …' : ''}</li>
                <li className="flex items-center gap-2"><Baby className="size-4 text-plum-600" aria-hidden="true" />{age}</li>
              </ul>
              <ButtonLink to={`/book/${service.slug}`} variant="accent" size="lg" className="mt-6 w-full">{t('service.bookThis')}</ButtonLink>
              <p className="mt-3 text-center text-xs text-ink-500">{t('booking.noPaymentNote')}</p>
            </div>
          </aside>
        </div>

        {similarServices.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">{t('service.similar')}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarServices.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}
            </div>
          </section>
        )}
      </Container>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-500">{t('common.startingFrom')}</p>
            <p className="text-xl font-extrabold text-plum-800">{money(service.startingPrice)}</p>
          </div>
          <ButtonLink to={`/book/${service.slug}`} variant="accent">{t('service.bookThis')}</ButtonLink>
        </div>
      </div>
    </div>
  );
}
