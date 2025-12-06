/**
 * Route configuration for the remake application.
 * Defines all routes and their corresponding page components.
 */

import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';

// Lazy load page components for code splitting
import { Center, Loader } from '@mantine/core';
import { lazy, Suspense } from 'react';

// Layout will be imported once created
// For now, we define routes that will be used with the Layout

const HomePage = lazy(() => import('./pages/home/home-page').then((m) => ({ default: m.HomePage })));
const SubmissionsPage = lazy(() => import('./pages/submissions/submissions-page').then((m) => ({ default: m.SubmissionsPage })));
const SettingsPage = lazy(() => import('./pages/settings/settings-page').then((m) => ({ default: m.SettingsPage })));

/**
 * Loading fallback component for lazy-loaded routes.
 */
function PageLoader() {
  return (
    <Center style={{ minHeight: 200 }}>
      <Loader />
    </Center>
  );
}

/**
 * Route definitions for the remake app.
 * These are used inside the Layout component via Outlet.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <HomePage />
      </Suspense>
    ),
  },
  {
    path: '/submissions',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SubmissionsPage />
      </Suspense>
    ),
  },
  {
    path: '/settings',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SettingsPage />
      </Suspense>
    ),
  },
  {
    // Catch-all redirect to home
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

/**
 * Create the router instance.
 * Note: This will be wrapped with Layout in the RemakeApp entry point.
 */
export function createRemakeRouter() {
  return createBrowserRouter(routes);
}
