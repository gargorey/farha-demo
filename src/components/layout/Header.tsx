import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarHeart, LogIn, LogOut, Menu, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCustomerSession } from '@/features/customer-auth/session-context';
import { formatSaudiMobile } from '@/utils/phone';
import { Button, ButtonLink } from '../common/Button';
import { cn } from '../common/cn';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';

export const mainNav = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/services', key: 'nav.services' },
  { to: '/plan', key: 'nav.planner' },
  { to: '/bookings', key: 'nav.myBookings' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' },
] as const;

export function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { session, signOut } = useCustomerSession();
  const phone = session.verified && session.phone ? formatSaudiMobile(session.phone) : undefined;

  useEffect(() => setOpen(false), [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors', isActive ? 'bg-plum-50 text-plum-800' : 'text-ink-700 hover:text-plum-800');

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/70 bg-sand-50/85 backdrop-blur-lg">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label={t('nav.menu')} className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={'end' in item} className={linkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {phone ? (
            <span className="hidden items-center gap-1 md:flex">
              <ButtonLink to="/bookings" variant="outline" size="sm" className="h-10" icon={<UserRound className="size-4" aria-hidden="true" />} title={t('auth.signedInAs', { phone })}>
                <span className="ltr-value">{phone}</span>
              </ButtonLink>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-full text-ink-700 hover:bg-plum-50 hover:text-plum-800"
                aria-label={t('bookings.signOut')}
                title={t('bookings.signOut')}
                onClick={() => void signOut()}
              >
                <LogOut className="flip-rtl size-4" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <span className="hidden md:block">
              <ButtonLink to="/signin" variant="ghost" size="sm" className="h-10" icon={<LogIn className="flip-rtl size-4" aria-hidden="true" />}>
                {t('auth.signIn')}
              </ButtonLink>
            </span>
          )}
          <span className="hidden sm:block">
            <ButtonLink to="/services" variant="accent" size="sm" className="h-10" icon={<CalendarHeart className="size-4" aria-hidden="true" />}>
              {t('nav.bookNow')}
            </ButtonLink>
          </span>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-ink-100 bg-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t('nav.menu')}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label={t('nav.menu')} className="animate-fade-up border-t border-ink-100 bg-white px-4 pb-5 pt-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            {[...mainNav, { to: '/faq', key: 'nav.faq' } as const].map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={'end' in item} className={({ isActive }) => cn('block rounded-xl px-4 py-3 font-medium', isActive ? 'bg-plum-50 text-plum-800' : 'text-ink-700')}>
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-ink-100 pt-3">
            {phone ? (
              <div className="flex items-center justify-between gap-3 px-4">
                <span className="flex items-center gap-2 text-sm text-ink-700">
                  <UserRound className="size-4" aria-hidden="true" />
                  <span className="ltr-value">{phone}</span>
                </span>
                <Button size="sm" variant="ghost" icon={<LogOut className="flip-rtl size-4" aria-hidden="true" />} onClick={() => void signOut()}>
                  {t('bookings.signOut')}
                </Button>
              </div>
            ) : (
              <ButtonLink to="/signin" variant="outline" className="w-full" icon={<LogIn className="flip-rtl size-4" aria-hidden="true" />}>
                {t('auth.signIn')}
              </ButtonLink>
            )}
          </div>
          <ButtonLink to="/services" variant="accent" className="mt-3 w-full">
            {t('nav.bookNow')}
          </ButtonLink>
        </nav>
      )}
    </header>
  );
}
