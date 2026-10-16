import { Link } from 'react-router-dom';
import { Clock, MapPin, Sparkles } from 'lucide-react';
import type { Service } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { Badge } from '../common/Badge';
import { ArrowForward } from '../common/Icons';
import { SmartImage } from '../common/SmartImage';
import { StarRating } from '../common/StarRating';

export function ServiceCard({ service, index = 0 }: { service: Service; index?: number }) {
  const { t, l, money, duration, num } = useLocale();
  const { categoryById } = useReferenceData();
  const category = categoryById(service.categoryId);
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <SmartImage media={service.media[0]} seed={index + 3} className="size-full transition-transform duration-500 group-hover:scale-105" decorative />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          {category && <Badge tone="dark">{l(category.name)}</Badge>}
          {service.featured && (
            <Badge tone="gold" icon={<Sparkles className="size-3" aria-hidden="true" />}>
              {t('common.featured')}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center justify-between gap-2 text-sm">
          <StarRating rating={service.rating} count={service.reviewCount} />
          <span className="text-xs text-ink-500">{t('common.bookings', { count: service.bookingsCount })}</span>
        </div>
        <h3 className="text-lg font-bold leading-snug">
          <Link to={`/services/${service.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {l(service.name)}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{l(service.shortDescription)}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{duration(service.durationMinutes)}+</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{num(service.cityIds.length)} {t('home.stats.cities')}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <span className="block text-xs text-ink-500">{t('common.startingFrom')}</span>
            <span className="text-xl font-extrabold text-plum-800">{money(service.startingPrice)}</span>
          </div>
          <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-plum-50 px-3.5 py-2 text-sm font-semibold text-plum-800 transition-colors group-hover:bg-plum-800 group-hover:text-white">
            {t('common.viewDetails')}
            <ArrowForward className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
