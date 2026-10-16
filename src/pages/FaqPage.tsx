import { ShieldAlert } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { Accordion } from '@/components/common/Accordion';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';

const sections: Record<string, string[]> = {
  booking: ['howBook', 'instant', 'account'],
  pricing: ['priceInclude', 'vat', 'payment'],
  availability: ['areas', 'availability'],
  changes: ['modify', 'cancel', 'refund'],
  support: ['contact'],
};

export default function FaqPage() {
  const { t } = useLocale();
  useDocumentTitle(t('faq.title'));
  return (
    <Container className="max-w-4xl py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('nav.faq') }]} />
      <h1 className="text-4xl font-extrabold tracking-tight">{t('faq.title')}</h1>
      <p className="mt-2 text-ink-500">{t('faq.subtitle')}</p>
      <p className="mt-6 flex items-start gap-3 rounded-2xl border border-gold-200 bg-gold-100/60 p-4 text-sm font-medium text-ink-700" role="note">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden="true" />
        {t('faq.policyNotice')}
      </p>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label={t('faq.title')}>
        {Object.keys(sections).map((s) => (
          <a key={s} href={`#faq-${s}`} onClick={(e) => { e.preventDefault(); document.getElementById(`faq-${s}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-soft ring-1 ring-ink-100 hover:bg-plum-50">
            {t(`faq.sections.${s}`)}
          </a>
        ))}
      </nav>
      <div className="mt-10 space-y-10">
        {Object.entries(sections).map(([s, keys]) => (
          <section key={s} id={`faq-${s}`} className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold">{t(`faq.sections.${s}`)}</h2>
            <Accordion items={keys.map((k) => ({ id: k, question: t(`faq.items.${k}.q`), answer: t(`faq.items.${k}.a`) }))} />
          </section>
        ))}
      </div>
      <div className="mt-12 text-center">
        <ButtonLink to="/contact" variant="primary">{t('nav.contact')}</ButtonLink>
      </div>
    </Container>
  );
}
