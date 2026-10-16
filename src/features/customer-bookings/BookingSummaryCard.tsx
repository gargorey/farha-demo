import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import type { Booking, Service } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { useReferenceData } from '@/hooks/useReferenceData';
import { ArrowForward } from '@/components/common/Icons';
import { SmartImage } from '@/components/common/SmartImage';
import { StatusBadge } from '@/components/booking/StatusBadge';

export function BookingSummaryCard({ booking, service }: { booking: Booking; service?: Service }) {
  const { t, l, date, money } = useLocale();
  const { cityById } = useReferenceData();
  return (
    <article className="group relative flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-ink-100 transition hover:shadow-lift sm:flex-row sm:items-center">
      {service && <SmartImage media={service.media[0]} className="aspect-[16/9] w-full shrink-0 rounded-2xl sm:aspect-square sm:size-24" decorative />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="ltr-value text-xs font-semibold text-ink-500">{booking.reference}</span>
        </div>
        <h3 className="mt-2 font-bold">
          <Link to={`/bookings/${booking.id}`} className="after:absolute after:inset-0">{l(service?.name) || booking.selection.serviceId}</Link>
        </h3>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" aria-hidden="true" />{date(booking.event.date, 'medium')}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden="true" />{l(cityById(booking.event.cityId)?.name)}</span>
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <span className="text-lg font-extrabold text-plum-800">{money(booking.pricing.total)}</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-plum-700">{t('bookings.open')}<ArrowForward className="size-4" /></span>
      </div>
    </article>
  );
}
