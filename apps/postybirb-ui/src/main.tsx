import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './icons/icons';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { EuiErrorBoundary } from '@elastic/eui';
import App from './app/app';
import AppThemeProvider from './app/app-theme-provider';
import { SubmissionsPath } from './pages/route-paths';
import MessageSubmissionManagementPage from './pages/submission/message-submission-management-page';
import FileSubmissionManagementPage from './pages/submission/file-submission-management-page';
import EditSubmissionPage from './pages/submission/edit-submission-page';
import SubmissionOutletPage from './pages/submission/submission-outlet-page';
import NotFound from './pages/not-found/not-found';
import HomePage from './pages/home/home-page';
import './styles.css';
import './i18n';

function Root() {
  return (
    <EuiErrorBoundary>
      <I18nProvider i18n={i18n}>
        <AppThemeProvider>
          <App />
        </AppThemeProvider>
      </I18nProvider>
    </EuiErrorBoundary>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        path: '',
        element: <HomePage />,
      },
      {
        path: SubmissionsPath,
        element: <SubmissionOutletPage />,
        children: [
          {
            path: 'message',
            element: <MessageSubmissionManagementPage />,
          },
          {
            path: 'file',
            element: <FileSubmissionManagementPage />,
          },
          {
            path: 'edit/:id',
            element: <EditSubmissionPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

declare global {
  interface Window {
    electron: {
      getAppVersion(): Promise<string>;
      pickDirectory?(): Promise<string | undefined>;
      platform: string;
      app_port: string;
      app_version: string;
    };
  }
}
