/**
 * Route configuration for the remake application.
 * Defines all routes and their corresponding page components.
 */

import { Navigate, type RouteObject } from 'react-router-dom';
import { FileSubmissionsPage } from './pages/file-submissions/file-submissions-page';
import { HomePage } from './pages/home/home-page';
import { MessageSubmissionsPage } from './pages/message-submissions/message-submissions-page';

/**
 * Route definitions for the remake app.
 * These are used inside the Layout component via Outlet.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/file-submissions',
    element: <FileSubmissionsPage />,
  },
  {
    path: '/message-submissions',
    element: <MessageSubmissionsPage />,
  },
  {
    // Catch-all redirect to home
    path: '*',
    element: <Navigate to="/" replace />,
  },
];
