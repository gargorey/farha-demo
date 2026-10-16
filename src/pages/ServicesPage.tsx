import { useEffect, useState } from 'react';
import { CalendarDays, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useCatalogQuery, type CatalogFilters } from '@/features/catalog/useCatalogQuery';
import { searchContext } from '@/features/event-discovery/search-context';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { Input, Select } from '@/components/common/Field';
import { Skeleton } from '@/components/common/Spinner';
import { EmptyState, ErrorState } from '@/components/common/StateViews';
import { cn } from '@/components/common/cn';
import { ServiceCard } from '@/components/services/ServiceCard';

function FilterPanel({ filters, update }: { filters: CatalogFilters; update: (p: Partial<CatalogFilters>) => void }) {
  const { t, l } = useLocale();
  const { categories, eventTypes, cities } = useReferenceData();
  const toggleCategory = (id: string) =>
    update({ categories: filters.categories.includes(id) ? filters.categories.filter((c) => c !== id) : [...filters.categories, id] });

  const heading = 'mb-3 text-sm font-bold text-ink-900';
  return (
    <div className="space-y-7">
      <fieldset>
        <legend className={heading}>{t('catalog.category')}</legend>
        <div className="space-y-1">
          {categories.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-sand-100">
              <input
                type="checkbox"
                className="size-4 rounded accent-plum-700"
                checked={filters.categories.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
              />
              {l(c.name)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className={cn(heading, 'block')}>{t('catalog.eventType')}</span>
        <Select value={filters.eventType} onChange={(e) => update({ eventType: e.target.value })}>
          <option value="">{t('home.anyEventType')}</option>
          {eventTypes.map((e) => <option key={e.id} value={e.id}>{l(e.name)}</option>)}
        </Select>
      </label>
      <label className="block">
        <span className={cn(heading, 'block')}>{t('catalog.city')}</span>
        <Select value={filters.city} onChange={(e) => update({ city: e.target.value })}>
          <option value="">{t('home.anyCity')}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}
        </Select>
      </label>
      <fieldset>
        <legend className={heading}>{t('catalog.price')}</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" inputMode="numeric" min={0} step={100} placeholder={t('catalog.priceMin')} aria-label={t('catalog.priceMin')} value={filters.minPrice} onChange={(e) => update({ minPrice: e.target.value })} />
          <Input type="number" inputMode="numeric" min={0} step={100} placeholder={t('catalog.priceMax')} aria-label={t('catalog.priceMax')} value={filters.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} />
        </div>
      </fieldset>
      <fieldset>
        <legend className={heading}>{t('catalog.duration')}</legend>
        <div className="flex flex-wrap gap-2">
          {(['', 'short', 'medium', 'long'] as const).map((d) => (
            <button
              key={d || 'any'}
              type="button"
              aria-pressed={filters.duration === d}
              onClick={() => update({ duration: d })}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                filters.duration === d ? 'border-plum-700 bg-plum-800 text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-plum-200',
              )}
            >
              {t(`catalog.durationOptions.${d || 'any'}`)}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export default function ServicesPage() {
  const { t, l, money, date } = useLocale();
  const { categoryById, eventTypeById, cityById } = useReferenceData();
  const { filters, query, update, reset } = useCatalogQuery();
  const [search, setSearch] = useState(filters.q);
  const [mobileFilters, setMobileFilters] = useState(false);
  useDocumentTitle(t('catalog.title'));

  // Debounce free-text search into the URL.
  useEffect(() => {
    const id = setTimeout(() => search !== filters.q && update({ q: search }), 300);
    return () => clearTimeout(id);
  }, [search, filters.q, update]);
  useEffect(() => setSearch(filters.q), [filters.q]);

  // Remember the event context so the booking form can be pre-filled.
  useEffect(() => {
    searchContext.merge({ eventTypeId: filters.eventType || undefined, cityId: filters.city || undefined, date: filters.date || undefined });
  }, [filters.eventType, filters.city, filters.date]);

  const { data, error, loading, reload } = useAsync(() => api.listServices(query), [JSON.stringify(query)]);

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(filters.q ? [{ key: 'q', label: `“${filters.q}”`, clear: () => { setSearch(''); update({ q: '' }); } }] : []),
    ...filters.categories.map((id) => ({ key: `c-${id}`, label: l(categoryById(id)?.name), clear: () => update({ categories: filters.categories.filter((c) => c !== id) }) })),
    ...(filters.eventType ? [{ key: 'e', label: l(eventTypeById(filters.eventType)?.name), clear: () => update({ eventType: '' }) }] : []),
    ...(filters.city ? [{ key: 'city', label: l(cityById(filters.city)?.name), clear: () => update({ city: '' }) }] : []),
    ...(filters.minPrice ? [{ key: 'min', label: `≥ ${money(Number(filters.minPrice))}`, clear: () => update({ minPrice: '' }) }] : []),
    ...(filters.maxPrice ? [{ key: 'max', label: `≤ ${money(Number(filters.maxPrice))}`, clear: () => update({ maxPrice: '' }) }] : []),
    ...(filters.duration ? [{ key: 'd', label: t(`catalog.durationOptions.${filters.duration}`), clear: () => update({ duration: '' }) }] : []),
    ...(filters.date ? [{ key: 'date', label: date(filters.date, 'medium'), clear: () => update({ date: '' }) }] : []),
  ];

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('nav.services') }]} />
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('catalog.title')}</h1>
        <p className="mt-2 text-ink-500">{t('catalog.subtitle')}</p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('catalog.searchPlaceholder')} aria-label={t('common.search')} className="h-12 ps-11" />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 lg:hidden" onClick={() => setMobileFilters(true)} icon={<SlidersHorizontal className="size-4" aria-hidden="true" />}>
            {t('catalog.filters')}
            {chips.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-plum-800 text-[11px] text-white">{chips.length}</span>}
          </Button>
          <label className="flex items-center gap-2">
            <span className="hidden text-sm text-ink-500 sm:inline">{t('catalog.sort')}</span>
            <Select className="h-12 min-w-44" value={filters.sort} onChange={(e) => update({ sort: e.target.value as CatalogFilters['sort'] })} aria-label={t('catalog.sort')}>
              {(['relevance', 'price-asc', 'price-desc', 'popularity', 'rating'] as const).map((s) => (
                <option key={s} value={s}>{t(`catalog.sortOptions.${s}`)}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block" aria-label={t('catalog.filters')}>
          <div className="sticky top-24 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-ink-100">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold">{t('catalog.filters')}</h2>
              {chips.length > 0 && <button type="button" onClick={() => { setSearch(''); reset(); }} className="text-sm font-semibold text-plum-700 hover:underline">{t('common.reset')}</button>}
            </div>
            <FilterPanel filters={filters} update={update} />
          </div>
        </aside>

        <section aria-live="polite" aria-busy={loading}>
          <div className="mb-4 flex min-h-8 flex-wrap items-center gap-2">
            <p className="me-2 text-sm font-semibold text-ink-700">{data ? t('catalog.results', { count: data.total }) : ' '}</p>
            {chips.length > 0 && <span className="sr-only">{t('catalog.activeFilters')}</span>}
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={c.clear} aria-label={t('catalog.removeFilter', { label: c.label })} className="inline-flex items-center gap-1 rounded-full bg-plum-100 px-3 py-1 text-xs font-semibold text-plum-800 hover:bg-plum-200">
                {c.key === 'date' && <CalendarDays className="size-3.5" aria-hidden="true" />}
                {c.label}
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ))}
            {chips.length > 1 && <button type="button" onClick={() => { setSearch(''); reset(); }} className="text-xs font-semibold text-ink-500 underline">{t('catalog.clearAll')}</button>}
          </div>

          {error ? (
            <ErrorState error={error} onRetry={reload} title={t('catalog.errorTitle')} />
          ) : loading && !data ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}</div>
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title={t('catalog.emptyTitle')}
              text={t('catalog.emptyText')}
              action={<Button variant="primary" onClick={() => { setSearch(''); reset(); }}>{t('catalog.clearAll')}</Button>}
            />
          ) : (
            <div className={cn('grid gap-6 sm:grid-cols-2 xl:grid-cols-3 transition-opacity', loading && 'opacity-60')}>
              {data?.items.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}
            </div>
          )}
        </section>
      </div>

      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('catalog.filters')}>
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 animate-fade-up">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('catalog.filters')}</h2>
              <button type="button" onClick={() => setMobileFilters(false)} className="rounded-full p-2 hover:bg-sand-100" aria-label={t('common.close')}><X className="size-5" aria-hidden="true" /></button>
            </div>
            <FilterPanel filters={filters} update={update} />
            <div className="sticky bottom-0 mt-6 flex gap-3 bg-white pt-3">
              <Button variant="outline" className="flex-1" onClick={() => { setSearch(''); reset(); }}>{t('common.reset')}</Button>
              <Button variant="primary" className="flex-1" onClick={() => setMobileFilters(false)}>{t('catalog.applyFilters')}{data ? ` (${data.total})` : ''}</Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
