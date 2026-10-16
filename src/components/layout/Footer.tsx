import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { businessConfig } from '@/config/business';
import { useReferenceData } from '@/hooks/useReferenceData';
import { useLocale } from '@/hooks/useLocale';
import { Logo } from './Logo';

export function Footer() {
  const { t } = useTranslation();
  const { l } = useLocale();
  const { categories } = useReferenceData();
  const { contact } = businessConfig;
  const linkCls = 'text-white/70 hover:text-white transition-colors';
  return (
    <footer className="mt-24 bg-plum-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm text-white/70">{t('footer.about')}</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-white/80"><Phone className="size-4 text-gold-400" aria-hidden="true" /><span className="ltr-value">{contact.phone}</span></li>
            <li className="flex items-center gap-2 text-white/80"><MessageCircle className="size-4 text-gold-400" aria-hidden="true" /><span className="ltr-value">{contact.whatsapp}</span></li>
            <li className="flex items-center gap-2 text-white/80"><Mail className="size-4 text-gold-400" aria-hidden="true" /><span className="ltr-value">{contact.email}</span></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gold-400">{t('footer.explore')}</h2>
          <ul className="space-y-2.5 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link className={linkCls} to={`/services?category=${c.id}`}>{l(c.name)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gold-400">{t('footer.company')}</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link className={linkCls} to="/about">{t('nav.about')}</Link></li>
            <li><Link className={linkCls} to="/contact">{t('nav.contact')}</Link></li>
            <li><Link className={linkCls} to="/plan">{t('nav.planner')}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gold-400">{t('footer.help')}</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link className={linkCls} to="/faq">{t('nav.faq')}</Link></li>
            <li><Link className={linkCls} to="/bookings">{t('nav.myBookings')}</Link></li>
            <li><Link className={linkCls} to="/services">{t('nav.services')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/55 sm:px-6 lg:px-8">
          <span>{t('footer.rights', { year: new Date().getFullYear() })}</span>
          <span>{t('footer.demo')}</span>
        </div>
      </div>
    </footer>
  );
}
