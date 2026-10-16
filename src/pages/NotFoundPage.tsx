import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { Illustration } from '@/components/common/Illustration';

export default function NotFoundPage() {
  const { t } = useLocale();
  useDocumentTitle(t('notFound.title'));
  return (
    <Container className="flex flex-col items-center py-20 text-center">
      <Illustration motif="illusion" seed={9} className="aspect-[4/3] w-full max-w-sm rounded-3xl shadow-lift" />
      <p className="mt-8 text-6xl font-extrabold text-plum-200">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t('notFound.title')}</h1>
      <p className="mt-2 text-ink-500">{t('notFound.text')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/" variant="primary">{t('notFound.home')}</ButtonLink>
        <ButtonLink to="/services" variant="outline">{t('nav.services')}</ButtonLink>
      </div>
    </Container>
  );
}
