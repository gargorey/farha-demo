import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronForward } from './Icons';

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('nav.breadcrumb')} className="mb-5 text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronForward className="size-3.5" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-plum-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
