import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  CalendarDays,
  CalendarHeart,
  Compass,
  Headphones,
  Languages,
  MapPin,
  Quote,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { Service } from '@/models';
import { api } from '@/services/api';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { businessConfig } from '@/config/business';
import { addDays, todayISO } from '@/utils/dates';
import { Accordion } from '@/components/common/Accordion';
import { Button, ButtonLink } from '@/components/common/Button';
import { Container, SectionHeader } from '@/components/common/Container';
import { Select, Input } from '@/components/common/Field';
import { ArrowForward } from '@/components/common/Icons';
import { Illustration } from '@/components/common/Illustration';
import { Skeleton } from '@/components/common/Spinner';
import { Stars } from '@/components/common/StarRating';
import { ErrorState } from '@/components/common/StateViews';
import { CategoryCard } from '@/components/services/CategoryCard';
import { ServiceCard } from '@/components/services/ServiceCard';

function HeroSearch() {
  const { t, l } = useLocale();
  const { categories, eventTypes, cities } = useReferenceData();
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: '', eventType: '', date: '', city: '' });
  const minDate = addDays(todayISO(), businessConfig.booking.minLeadDays);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (form.category) params.set('category', form.category);
    if (form.eventType) params.set('event', form.eventType);
    if (form.city) params.set('city', form.city);
    if (form.date) params.set('date', form.date);
    navigate(`/services?${params.toString()}`);
  };

  const label = 'mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-500';
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-3xl bg-white p-4 shadow-lift ring-1 ring-ink-100 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="block">
        <span className={label}><Sparkles className="size-3.5" aria-hidden="true" />{t('home.searchCategory')}</span>
        <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="">{t('home.anyCategory')}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}
        </Select>
      </label>
      <label className="block">
        <span className={label}><CalendarHeart className="size-3.5" aria-hidden="true" />{t('home.searchEventType')}</span>
        <Select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
          <option value="">{t('home.anyEventType')}</option>
          {eventTypes.map((et) => <option key={et.id} value={et.id}>{l(et.name)}</option>)}
        </Select>
      </label>
      <label className="block">
        <span className={label}><CalendarDays className="size-3.5" aria-hidden="true" />{t('home.searchDate')}</span>
        <Input type="date" min={minDate} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </label>
      <label className="block">
        <span className={label}><MapPin className="size-3.5" aria-hidden="true" />{t('home.searchCity')}</span>
        <Select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
          <option value="">{t('home.anyCity')}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}
        </Select>
      </label>
      <Button type="submit" variant="primary" size="lg" className="h-[46px] sm:col-span-2 lg:col-span-1" icon={<Search className="size-4" aria-hidden="true" />}>
        {t('home.searchButton')}
      </Button>
    </form>
  );
}

function Hero({ serviceCount, avgRating }: { serviceCount: number; avgRating?: number }) {
  const { t, num } = useLocale();
  const { cities, categories } = useReferenceData();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-plum-50 via-sand-50 to-sand-50">
      <div className="pointer-events-none absolute -top-40 start-1/2 size-[36rem] rounded-full bg-gold-200/40 blur-3xl" aria-hidden="true" />
      <Container className="relative grid items-center gap-10 pb-12 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pb-16 lg:pt-16">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-plum-700 shadow-soft ring-1 ring-plum-100">
            <Sparkles className="size-3.5 text-gold-500" aria-hidden="true" />
            {t('home.heroEyebrow')}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            {t('home.heroTitle')}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-700">{t('home.heroSubtitle')}</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              { Icon: Compass, key: 'discover' },
              { Icon: BadgeCheck, key: 'match' },
              { Icon: ShieldCheck, key: 'book' },
            ].map(({ Icon, key }) => (
              <li key={key} className="flex items-start gap-2.5 text-sm font-semibold text-ink-900">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-plum-700 shadow-soft ring-1 ring-ink-100">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="pt-1">{t(`home.pillars.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative hidden lg:block" aria-hidden="true">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 pt-10">
              <Illustration motif="magic" seed={2} className="aspect-[4/5] w-full rounded-3xl shadow-lift animate-float" />
              <Illustration motif="bubbles" seed={5} className="aspect-square w-full rounded-3xl shadow-lift" />
            </div>
            <div className="space-y-4">
              <Illustration motif="clown" seed={3} className="aspect-square w-full rounded-3xl shadow-lift" />
              <Illustration motif="mascot" seed={8} className="aspect-[4/5] w-full rounded-3xl shadow-lift animate-float [animation-delay:1.5s]" />
            </div>
          </div>
          {avgRating != null && (
            <div className="absolute -start-6 bottom-10 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-ink-100">
              <div className="flex items-center gap-2"><Stars value={avgRating} /><span className="text-sm font-bold">{num(avgRating)}</span></div>
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          <HeroSearch />
          <dl className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-3 text-center lg:justify-start">
            {[
              [serviceCount, 'home.stats.services'],
              [cities.length, 'home.stats.cities'],
              [categories.length, 'home.stats.categories'],
            ].map(([n, key]) => (
              <div key={String(key)} className="flex items-baseline gap-2">
                <dt className="sr-only">{t(String(key))}</dt>
                <dd className="text-2xl font-extrabold text-plum-800">{num(Number(n))}+</dd>
                <span className="text-sm text-ink-500" aria-hidden="true">{t(String(key))}</span>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

function ServiceGrid({ services, loading }: { services?: Service[]; loading: boolean }) {
  if (loading || !services) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {services.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}
    </div>
  );
}

export default function HomePage() {
  const { t, l } = useLocale();
  const { categories, eventTypes } = useReferenceData();
  useDocumentTitle();
  const { data, loading, error, reload } = useAsync(() => api.listServices(), []);
  const all = data?.items;

  const popular = all ? [...all].sort((a, b) => b.bookingsCount - a.bookingsCount).slice(0, 4) : undefined;
  const recommended = all ? all.filter((s) => s.featured && !popular?.includes(s)).slice(0, 4) : undefined;
  const countByCategory = (id: string) => all?.filter((s) => s.categoryId === id).length ?? 0;
  const showcaseEvents = ['birthday', 'wedding', 'corporate', 'school', 'national-day', 'family'];

  const testimonials = all
    ? all.flatMap((s) => s.reviews.filter((r) => r.rating === 5).slice(0, 1).map((r) => ({ r, s }))).slice(0, 3)
    : [];

  return (
    <>
      <Hero
        serviceCount={all?.length ?? 0}
        avgRating={all?.length ? Math.round((all.reduce((sum, x) => sum + x.rating, 0) / all.length) * 10) / 10 : undefined}
      />

      {error ? (
        <Container className="py-12"><ErrorState error={error} onRetry={reload} /></Container>
      ) : (
        <>
          {/* Categories */}
          <section className="py-16">
            <Container>
              <SectionHeader
                title={t('home.categoriesTitle')}
                subtitle={t('home.categoriesSubtitle')}
                action={<Link to="/services" className="inline-flex items-center gap-1 font-semibold text-plum-700 hover:underline">{t('common.viewAll')}<ArrowForward className="size-4" /></Link>}
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {categories.map((c, i) => <CategoryCard key={c.id} category={c} count={countByCategory(c.id)} index={i} />)}
              </div>
            </Container>
          </section>

          {/* Popular */}
          <section className="bg-white py-16">
            <Container>
              <SectionHeader
                title={t('home.popularTitle')}
                subtitle={t('home.popularSubtitle')}
                action={<Link to="/services?sort=popularity" className="inline-flex items-center gap-1 font-semibold text-plum-700 hover:underline">{t('common.viewAll')}<ArrowForward className="size-4" /></Link>}
              />
              <ServiceGrid services={popular} loading={loading} />
            </Container>
          </section>

          {/* How it works */}
          <section className="py-16">
            <Container>
              <SectionHeader title={t('home.howTitle')} className="justify-center text-center [&>div]:mx-auto" />
              <ol className="grid gap-6 md:grid-cols-3">
                {[
                  { key: 'discover', Icon: Search },
                  { key: 'customize', Icon: Settings2 },
                  { key: 'book', Icon: CalendarHeart },
                ].map(({ key, Icon }, i) => (
                  <li key={key} className="relative rounded-3xl bg-white p-7 shadow-soft ring-1 ring-ink-100">
                    <span className="absolute end-6 top-5 text-5xl font-extrabold text-plum-50" aria-hidden="true">{i + 1}</span>
                    <span className="grid size-12 place-items-center rounded-2xl bg-plum-800 text-gold-400"><Icon className="size-6" aria-hidden="true" /></span>
                    <h3 className="mt-5 text-xl font-bold">{t(`home.howSteps.${key}.title`)}</h3>
                    <p className="mt-2 text-ink-500">{t(`home.howSteps.${key}.text`)}</p>
                  </li>
                ))}
              </ol>
            </Container>
          </section>

          {/* Recommended */}
          <section className="bg-white py-16">
            <Container>
              <SectionHeader title={t('home.recommendedTitle')} subtitle={t('home.recommendedSubtitle')} />
              <ServiceGrid services={recommended} loading={loading} />
            </Container>
          </section>

          {/* By event type */}
          <section className="py-16">
            <Container>
              <SectionHeader title={t('home.byEventTitle')} subtitle={t('home.byEventSubtitle')} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {showcaseEvents.map((id) => {
                  const et = eventTypes.find((e) => e.id === id);
                  if (!et) return null;
                  const list = all?.filter((s) => s.eventTypeIds.includes(id)) ?? [];
                  return (
                    <Link
                      key={id}
                      to={`/services?event=${id}`}
                      className="group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <Illustration motif={list[0]?.media[0].motif ?? 'variety'} seed={id.length} className="size-20 shrink-0 rounded-2xl" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold">{l(et.name)}</h3>
                        <p className="truncate text-sm text-ink-500">{list.slice(0, 2).map((s) => l(s.name)).join(' • ')}</p>
                        <p className="mt-1 text-xs font-semibold text-plum-700">{t('home.servicesCount', { count: list.length })}</p>
                      </div>
                      <ArrowForward className="size-5 text-ink-300 transition group-hover:text-plum-700" />
                    </Link>
                  );
                })}
              </div>
            </Container>
          </section>

          {/* Benefits */}
          <section className="bg-plum-900 py-16 text-white">
            <Container>
              <h2 className="mb-10 text-center text-2xl font-bold text-white sm:text-3xl">{t('home.benefitsTitle')}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { key: 'transparent', Icon: ReceiptText },
                  { key: 'curated', Icon: BadgeCheck },
                  { key: 'bilingual', Icon: Languages },
                  { key: 'support', Icon: Headphones },
                ].map(({ key, Icon }) => (
                  <div key={key} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                    <Icon className="size-7 text-gold-400" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-bold text-white">{t(`home.benefits.${key}.title`)}</h3>
                    <p className="mt-1.5 text-sm text-white/70">{t(`home.benefits.${key}.text`)}</p>
                  </div>
                ))}
              </div>
            </Container>
          </section>

          {/* Testimonials */}
          <section className="py-16">
            <Container>
              <SectionHeader title={t('home.testimonialsTitle')} subtitle={t('home.testimonialsNote')} />
              <div className="grid gap-6 md:grid-cols-3">
                {testimonials.map(({ r, s }) => (
                  <figure key={r.id} className="flex flex-col rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink-100">
                    <Quote className="size-8 text-gold-400 flip-rtl" aria-hidden="true" />
                    <blockquote className="mt-3 flex-1 text-lg text-ink-900">“{l(r.comment)}”</blockquote>
                    <figcaption className="mt-5 flex items-center justify-between gap-3 border-t border-ink-100 pt-4 text-sm">
                      <div>
                        <div className="font-bold">{l(r.author)}</div>
                        <Link to={`/services/${s.slug}`} className="text-ink-500 hover:text-plum-700">{l(s.name)}</Link>
                      </div>
                      <Stars value={r.rating} />
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Container>
          </section>

          {/* FAQ */}
          <section className="bg-white py-16">
            <Container className="max-w-3xl">
              <SectionHeader
                title={t('home.faqTitle')}
                action={<Link to="/faq" className="inline-flex items-center gap-1 font-semibold text-plum-700 hover:underline">{t('common.viewAll')}<ArrowForward className="size-4" /></Link>}
              />
              <Accordion
                items={['howBook', 'instant', 'priceInclude', 'cancel'].map((k) => ({ id: k, question: t(`faq.items.${k}.q`), answer: t(`faq.items.${k}.a`) }))}
              />
            </Container>
          </section>

          {/* CTA */}
          <section className="pt-16">
            <Container>
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-plum-800 to-plum-600 px-6 py-14 text-center text-white sm:px-12">
                <Illustration motif="variety" seed={4} className="pointer-events-none absolute inset-0 size-full opacity-20" />
                <div className="relative">
                  <Tag className="mx-auto size-8 text-gold-400" aria-hidden="true" />
                  <h2 className="mt-4 text-3xl font-extrabold text-white">{t('home.ctaTitle')}</h2>
                  <p className="mx-auto mt-3 max-w-xl text-white/80">{t('home.ctaText')}</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <ButtonLink to="/plan" variant="accent" size="lg">{t('home.ctaPrimary')}</ButtonLink>
                    <ButtonLink to="/services" variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20">{t('home.ctaSecondary')}</ButtonLink>
                  </div>
                </div>
              </div>
            </Container>
          </section>
        </>
      )}
    </>
  );
}
