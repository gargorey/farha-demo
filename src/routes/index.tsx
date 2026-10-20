import { Suspense, type ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingBlock } from '@/components/common/StateViews';
import HomePage from '@/pages/HomePage';
import { RouteError } from '@/app/RouteError';
import { lazyWithReload } from '@/utils/lazy-with-reload';

// Secondary pages are code-split to keep the first load fast. If a deploy removed
// the file an open tab asks for, lazyWithReload reloads once to get the new version.
const ServicesPage = lazyWithReload(() => import('@/pages/ServicesPage'));
const ServiceDetailsPage = lazyWithReload(() => import('@/pages/ServiceDetailsPage'));
const PlannerPage = lazyWithReload(() => import('@/pages/PlannerPage'));
const BookingPage = lazyWithReload(() => import('@/pages/BookingPage'));
const BookingConfirmationPage = lazyWithReload(() => import('@/pages/BookingConfirmationPage'));
const MyBookingsPage = lazyWithReload(() => import('@/pages/MyBookingsPage'));
const BookingDetailsPage = lazyWithReload(() => import('@/pages/BookingDetailsPage'));
const SignInPage = lazyWithReload(() => import('@/pages/SignInPage'));
const AboutPage = lazyWithReload(() => import('@/pages/AboutPage'));
const ContactPage = lazyWithReload(() => import('@/pages/ContactPage'));
const FaqPage = lazyWithReload(() => import('@/pages/FaqPage'));
const NotFoundPage = lazyWithReload(() => import('@/pages/NotFoundPage'));

const s = (el: ReactNode) => <Suspense fallback={<LoadingBlock />}>{el}</Suspense>;

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      {
        // Page errors show inside the layout, so the header and footer stay visible.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'services', element: s(<ServicesPage />) },
          { path: 'services/:slug', element: s(<ServiceDetailsPage />) },
          { path: 'plan', element: s(<PlannerPage />) },
          { path: 'book/:slug', element: s(<BookingPage />) },
          { path: 'booking/confirmation/:id', element: s(<BookingConfirmationPage />) },
          { path: 'bookings', element: s(<MyBookingsPage />) },
          { path: 'bookings/:id', element: s(<BookingDetailsPage />) },
          { path: 'signin', element: s(<SignInPage />) },
          { path: 'about', element: s(<AboutPage />) },
          { path: 'contact', element: s(<ContactPage />) },
          { path: 'faq', element: s(<FaqPage />) },
          { path: '*', element: s(<NotFoundPage />) },
        ],
      },
    ],
  },
];
