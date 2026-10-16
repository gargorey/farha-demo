import { CalendarHeart, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { demoControls } from '@/services/mock/mock-client';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { isActiveStatus } from '@/utils/booking-lifecycle';
import { useServicesIndex } from '@/features/customer-bookings/useServicesIndex';
import { BookingSummaryCard } from '@/features/customer-bookings/BookingSummaryCard';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button, ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { DemoNote } from '@/components/common/DemoNote';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/StateViews';

export default function MyBookingsPage() {
  const { t } = useLocale();
  useDocumentTitle(t('bookings.title'));
  const { data, error, loading, reload } = useAsync(() => api.listBookings(), []);
  const services = useServicesIndex();

  const sorted = [...(data ?? [])].sort((a, b) => a.event.date.localeCompare(b.event.date));
  const active = sorted.filter((b) => isActiveStatus(b.status));
  const past = sorted.filter((b) => !isActiveStatus(b.status)).reverse();

  return (
    <Container className="max-w-4xl py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('bookings.title') }]} />
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('bookings.title')}</h1>
      {api.isDemo && <DemoNote className="mt-4">{t('bookings.demoSession')}</DemoNote>}

      <div className="mt-8">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingBlock />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<CalendarHeart className="size-7" aria-hidden="true" />}
            title={t('bookings.emptyTitle')}
            text={t('bookings.emptyText')}
            action={
              <>
                <ButtonLink to="/services" variant="primary">{t('bookings.browse')}</ButtonLink>
                {api.isDemo && (
                  <Button variant="outline" icon={<Sparkles className="size-4" aria-hidden="true" />} onClick={() => { demoControls.seedSampleBookings(); reload(); }}>
                    {t('bookings.loadSamples')}
                  </Button>
                )}
              </>
            }
          />
        ) : (
          <div className="space-y-10">
            {active.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-bold">{t('bookings.upcoming')}</h2>
                <div className="space-y-4">{active.map((b) => <BookingSummaryCard key={b.id} booking={b} service={services.get(b.selection.serviceId)} />)}</div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-bold">{t('bookings.past')}</h2>
                <div className="space-y-4 opacity-90">{past.map((b) => <BookingSummaryCard key={b.id} booking={b} service={services.get(b.selection.serviceId)} />)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}
