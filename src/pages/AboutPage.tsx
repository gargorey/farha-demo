import { Eye, Gem, Heart, Mic2 } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useLocale } from '@/hooks/useLocale';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ButtonLink } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { DemoNote } from '@/components/common/DemoNote';
import { Illustration } from '@/components/common/Illustration';

export default function AboutPage() {
  const { t } = useLocale();
  useDocumentTitle(t('about.title'));
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: t('nav.home'), to: '/' }, { label: t('nav.about') }]} />
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t('about.title')}</h1>
          <p className="mt-4 text-lg text-ink-700">{t('about.subtitle')}</p>
          <DemoNote className="mt-6 max-w-md">{t('about.demoNote')}</DemoNote>
        </div>
        <div className="grid grid-cols-2 gap-4" aria-hidden="true">
          <Illustration motif="host" seed={4} className="aspect-square w-full rounded-3xl shadow-lift" />
          <Illustration motif="kids" seed={6} className="mt-10 aspect-square w-full rounded-3xl shadow-lift" />
        </div>
      </section>

      <section className="mt-16 rounded-[2rem] bg-white p-8 shadow-soft ring-1 ring-ink-100 sm:p-12">
        <h2 className="text-2xl font-bold">{t('about.missionTitle')}</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-700">{t('about.mission')}</p>
      </section>

      <section className="mt-16">
        <h2 className="mb-8 text-2xl font-bold">{t('about.valuesTitle')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { k: 'clarity', Icon: Eye },
            { k: 'quality', Icon: Gem },
            { k: 'joy', Icon: Heart },
          ].map(({ k, Icon }) => (
            <div key={k} className="rounded-3xl bg-white p-7 shadow-soft ring-1 ring-ink-100">
              <span className="grid size-12 place-items-center rounded-2xl bg-gold-100 text-gold-600"><Icon className="size-6" aria-hidden="true" /></span>
              <h3 className="mt-5 text-lg font-bold">{t(`about.values.${k}.title`)}</h3>
              <p className="mt-2 text-ink-500">{t(`about.values.${k}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 flex flex-col items-start gap-6 rounded-[2rem] bg-plum-900 p-8 text-white sm:flex-row sm:items-center sm:p-12">
        <Mic2 className="size-12 shrink-0 text-gold-400" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{t('about.forProvidersTitle')}</h2>
          <p className="mt-2 text-white/75">{t('about.forProviders')}</p>
        </div>
        <ButtonLink to="/contact" variant="accent">{t('nav.contact')}</ButtonLink>
      </section>
    </Container>
  );
}
