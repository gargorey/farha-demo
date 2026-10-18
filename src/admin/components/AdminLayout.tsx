import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  ExternalLink,
  FlaskConical,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Percent,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tags,
  TicketPercent,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { cn } from '@/components/common/cn';
import { adminApi } from '../api';
import { useSession } from '../auth/session';
import { ADMIN_CHANGE_EVENT, adminStore } from '../data/admin-store';
import { useAdminLocale } from '../i18n';
import { siteUrl } from '../utils/helpers';
import { ConfirmDialog } from './ui';

type NavItem = { to: string; key: string; Icon: LucideIcon; end?: boolean };
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'operations',
    items: [
      { to: '/', key: 'overview', Icon: LayoutDashboard, end: true },
      { to: '/bookings', key: 'bookings', Icon: CalendarCheck2 },
      { to: '/calendar', key: 'calendar', Icon: CalendarDays },
      { to: '/customers', key: 'customers', Icon: Users },
    ],
  },
  {
    group: 'catalog',
    items: [
      { to: '/services', key: 'services', Icon: Sparkles },
      { to: '/categories', key: 'categories', Icon: Tags },
      { to: '/providers', key: 'providers', Icon: Handshake },
    ],
  },
  {
    group: 'business',
    items: [
      { to: '/pricing', key: 'pricing', Icon: Percent },
      { to: '/promotions', key: 'promotions', Icon: TicketPercent },
      { to: '/reports', key: 'reports', Icon: BarChart3 },
    ],
  },
  { group: 'settings', items: [{ to: '/staff', key: 'staff', Icon: ShieldCheck }] },
];

function AdminLogo() {
  const { a } = useAdminLocale();
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold-400">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
          <path d="M16 4l2.9 7.1L26.5 12l-5.7 4.8L22.6 24 16 20l-6.6 4 1.8-7.2L5.5 12l7.6-.9z" fill="#2d1648" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-extrabold text-white">{a('app.title')}</span>
        <span className="block text-[11px] text-white/60">{a('app.subtitle')}</span>
      </span>
    </div>
  );
}

function Sidebar({ needsAction, onNavigate }: { needsAction: number; onNavigate?: () => void }) {
  const { a, num } = useAdminLocale();
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <div className="flex h-full flex-col bg-plum-950 text-white">
      <div className="px-5 py-5">
        <AdminLogo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label={a('app.menu')}>
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">{a(`nav.groups.${g.group}`)}</p>
            <ul className="space-y-0.5">
              {g.items.map(({ to, key, Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white',
                      )
                    }
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className="flex-1">{a(`nav.${key}`)}</span>
                    {key === 'bookings' && needsAction > 0 && (
                      <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-plum-950">{num(needsAction)}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <a href={siteUrl('/')} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/6 hover:text-white">
          <ExternalLink className="size-[18px]" aria-hidden="true" />
          {a('app.viewSite')}
        </a>
        <button type="button" onClick={() => setResetOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/6 hover:text-white">
          <RotateCcw className="size-[18px]" aria-hidden="true" />
          {a('app.resetDemo')}
        </button>
      </div>
      <ConfirmDialog
        open={resetOpen}
        title={a('app.resetTitle')}
        text={a('app.resetText')}
        confirmLabel={a('app.resetDemo')}
        tone="danger"
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          adminStore.reset();
          window.location.reload();
        }}
      />
    </div>
  );
}

export function AdminLayout() {
  const { a } = useAdminLocale();
  const { user, signOut } = useSession();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [needsAction, setNeedsAction] = useState(0);

  // Refresh the "needs action" badge on every page change (cheap in the demo).
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      adminApi
        .listBookings({ status: 'needs_action', pageSize: 1 })
        .then((r) => alive && setNeedsAction(r.total))
        .catch(() => {});
    void refresh();
    // Also refresh after dashboard changes, and when the website (another tab) saves a booking.
    const onStorage = (e: StorageEvent) => e.key?.startsWith('farha.demo') && refresh();
    window.addEventListener(ADMIN_CHANGE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      alive = false;
      window.removeEventListener(ADMIN_CHANGE_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [location.pathname, location.search]);

  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="min-h-dvh bg-sand-50">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        {a('app.skip')}
      </a>
      <div className="bg-gold-100 text-gold-600">
        <p className="flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium">
          <FlaskConical className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{a('app.demoBanner')}</span>
          <span className="sm:hidden">{a('app.demoShort')}</span>
        </p>
      </div>
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">
          <Sidebar needsAction={needsAction} />
        </aside>
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" className="absolute inset-0 bg-ink-950/50" aria-label={a('common.cancel')} onClick={() => setDrawer(false)} />
            <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] animate-fade-up shadow-lift">
              <button type="button" onClick={() => setDrawer(false)} className="absolute end-3 top-5 z-10 rounded-full p-1.5 text-white/70 hover:bg-white/10" aria-label={a('common.cancel')}>
                <X className="size-5" aria-hidden="true" />
              </button>
              <Sidebar needsAction={needsAction} onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/90 px-4 backdrop-blur sm:px-6">
            <button type="button" className="rounded-xl p-2 text-ink-700 hover:bg-sand-100 lg:hidden" onClick={() => setDrawer(true)} aria-label={a('app.menu')}>
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="flex-1" />
            <LanguageSwitcher />
            {user && (
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-plum-100 text-sm font-bold text-plum-800" aria-hidden="true">
                  {user.name.charAt(0)}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-sm font-semibold">{user.name}</span>
                  <span className="block text-xs text-ink-500">{a(`roles.${user.role}`)}</span>
                </span>
                <button type="button" onClick={signOut} className="rounded-xl p-2 text-ink-500 hover:bg-sand-100 hover:text-ink-900" aria-label={a('app.signOut')} title={a('app.signOut')}>
                  <LogOut className="flip-rtl size-5" aria-hidden="true" />
                </button>
              </div>
            )}
          </header>
          <main id="admin-main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
