import { CalendarHeart, CircleCheck, LogOut } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { formatSaudiMobile } from '@/utils/phone';
import { PhoneSignIn } from '@/features/customer-auth/PhoneSignIn';
import { useCustomerSession } from '@/features/customer-auth/session-context';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button, ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';

/** Only same-site paths are allowed as the page to return to after signing in. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/bookings');

export default function SignInPage() {
  const { t } = useLocale();
  useDocumentTitle(t('auth.pageTitle'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, signOut } = useCustomerSession();
  const next = safeNext(params.get('next'));

  return (
    <Container className="max-w-xl py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('auth.pageTitle') }]} />
      {session.verified ? (
        <section className="rounded-3xl border border-ink-100 bg-white p-6 text-center">
          <CircleCheck className="mx-auto size-10 text-plum-600" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-extrabold">{t('auth.alreadySignedIn')}</h1>
          <p className="mt-1 text-ink-500">
            <span className="ltr-value">{formatSaudiMobile(session.phone ?? '')}</span>
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/bookings" variant="primary" icon={<CalendarHeart className="size-4" aria-hidden="true" />}>
              {t('nav.myBookings')}
            </ButtonLink>
            <Button variant="outline" icon={<LogOut className="flip-rtl size-4" aria-hidden="true" />} onClick={() => void signOut()}>
              {t('bookings.signOut')}
            </Button>
          </div>
        </section>
      ) : (
        <PhoneSignIn headingLevel={1} onSignedIn={() => navigate(next, { replace: true })} />
      )}
    </Container>
  );
}
