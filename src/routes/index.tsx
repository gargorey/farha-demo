import { lazy, Suspense, type ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingBlock } from '@/components/common/StateViews';
import HomePage from '@/pages/HomePage';

// Secondary pages are code-split to keep the first load fast.
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const ServiceDetailsPage = lazy(() => import('@/pages/ServiceDetailsPage'));
const PlannerPage = lazy(() => import('@/pages/PlannerPage'));
const BookingPage = lazy(() => import('@/pages/BookingPage'));
const BookingConfirmationPage = lazy(() => import('@/pages/BookingConfirmationPage'));
const MyBookingsPage = lazy(() => import('@/pages/MyBookingsPage'));
const BookingDetailsPage = lazy(() => import('@/pages/BookingDetailsPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const s = (el: ReactNode) => <Suspense fallback={<LoadingBlock />}>{el}</Suspense>;

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'services', element: s(<ServicesPage />) },
      { path: 'services/:slug', element: s(<ServiceDetailsPage />) },
      { path: 'plan', element: s(<PlannerPage />) },
      { path: 'book/:slug', element: s(<BookingPage />) },
      { path: 'booking/confirmation/:id', element: s(<BookingConfirmationPage />) },
      { path: 'bookings', element: s(<MyBookingsPage />) },
      { path: 'bookings/:id', element: s(<BookingDetailsPage />) },
      { path: 'about', element: s(<AboutPage />) },
      { path: 'contact', element: s(<ContactPage />) },
      { path: 'faq', element: s(<FaqPage />) },
      { path: '*', element: s(<NotFoundPage />) },
    ],
  },
];
