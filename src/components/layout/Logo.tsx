import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Logo({ light = false }: { light?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={t('nav.home')}>
      <span className="grid size-10 place-items-center rounded-2xl bg-plum-800 shadow-soft">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
          <path d="M16 4l2.9 7.1L26.5 12l-5.7 4.8L22.6 24 16 20l-6.6 4 1.8-7.2L5.5 12l7.6-.9z" fill="#f2b544" />
          <circle cx="25" cy="6" r="2" fill="#ff6b5b" />
          <circle cx="6" cy="25" r="1.5" fill="#fff" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className={`block text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-plum-900'}`}>{t('common.brand')}</span>
        <span className={`hidden text-[11px] font-medium sm:block ${light ? 'text-white/70' : 'text-ink-500'}`}>{t('common.tagline')}</span>
      </span>
    </Link>
  );
}
