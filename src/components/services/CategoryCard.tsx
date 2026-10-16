import { Link } from 'react-router-dom';
import type { ServiceCategory } from '@/models';
import { useLocale } from '@/hooks/useLocale';
import { Illustration } from '../common/Illustration';

export function CategoryCard({ category, count, index = 0 }: { category: ServiceCategory; count: number; index?: number }) {
  const { t, l } = useLocale();
  return (
    <Link
      to={`/services?category=${category.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-ink-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="aspect-[5/3] overflow-hidden">
        <Illustration motif={category.motif} seed={index + 11} className="size-full transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="p-4">
        <h3 className="font-bold leading-snug">{l(category.name)}</h3>
        <p className="mt-0.5 text-xs text-ink-500">{t('home.servicesCount', { count })}</p>
      </div>
    </Link>
  );
}
