import { useMemo } from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom';
import { appEnv } from '@/config/env';
import { routes } from '@/routes';
import { ErrorBoundary } from './ErrorBoundary';
import { ReferenceDataProvider } from './ReferenceDataProvider';

export function App() {
  // Hash routing lets the static demo build run from any host without server rewrites.
  const router = useMemo(() => (appEnv.routerMode === 'hash' ? createHashRouter(routes) : createBrowserRouter(routes)), []);
  return (
    <ErrorBoundary>
      <ReferenceDataProvider>
        <RouterProvider router={router} />
      </ReferenceDataProvider>
    </ErrorBoundary>
  );
}
