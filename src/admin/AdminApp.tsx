import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { createHashRouter, Link, RouterProvider, type RouteObject } from 'react-router-dom';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { ReferenceDataProvider } from '@/app/ReferenceDataProvider';
import { EmptyState, LoadingBlock } from '@/components/common/StateViews';
import { SessionProvider, useSession } from './auth/session';
import { AdminLayout } from './components/AdminLayout';
import { ToastProvider } from './components/ui';
import { CatalogProvider } from './hooks/useCatalog';
import { useAdminLocale } from './i18n';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';

const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const BookingDetailPage = lazy(() => import('./pages/BookingDetailPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ServiceEditPage = lazy(() => import('./pages/ServiceEditPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ProvidersPage = lazy(() => import('./pages/ProvidersPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const PromotionsPage = lazy(() => import('./pages/PromotionsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));

const s = (el: ReactNode) => <Suspense fallback={<LoadingBlock />}>{el}</Suspense>;

function NotFound() {
  const { a } = useAdminLocale();
  return (
    <EmptyState
      title="404"
      text={a('common.noResults')}
      action={
        <Link to="/" className="font-semibold text-plum-700 hover:underline">
          {a('nav.overview')}
        </Link>
      }
    />
  );
}

const routes: RouteObject[] = [
  {
    element: <AdminLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'bookings', element: s(<BookingsPage />) },
      { path: 'bookings/:id', element: s(<BookingDetailPage />) },
      { path: 'calendar', element: s(<CalendarPage />) },
      { path: 'services', element: s(<ServicesPage />) },
      { path: 'services/:id', element: s(<ServiceEditPage />) },
      { path: 'categories', element: s(<CategoriesPage />) },
      { path: 'providers', element: s(<ProvidersPage />) },
      { path: 'customers', element: s(<CustomersPage />) },
      { path: 'customers/:id', element: s(<CustomerDetailPage />) },
      { path: 'pricing', element: s(<PricingPage />) },
      { path: 'promotions', element: s(<PromotionsPage />) },
      { path: 'reports', element: s(<ReportsPage />) },
      { path: 'staff', element: s(<StaffPage />) },
      { path: '*', element: <NotFound /> },
    ],
  },
];

function Gate() {
  const { user } = useSession();
  // Hash routing: the dashboard is a static build served from /admin/ next to the website.
  const router = useMemo(() => createHashRouter(routes), []);
  if (!user) return <LoginPage />;
  return (
    <CatalogProvider>
      <RouterProvider router={router} />
    </CatalogProvider>
  );
}

export function AdminApp() {
  return (
    <ErrorBoundary>
      <ReferenceDataProvider>
        <SessionProvider>
          <ToastProvider>
            <Gate />
          </ToastProvider>
        </SessionProvider>
      </ReferenceDataProvider>
    </ErrorBoundary>
  );
}
