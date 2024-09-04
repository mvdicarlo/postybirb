import { EuiErrorBoundary } from '@elastic/eui';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './app/app';
import AppThemeProvider from './app/app-theme-provider';
import './icons/icons';
import HomePage from './pages/home/home-page';
import NotFound from './pages/not-found/not-found';
import { SubmissionsPath } from './pages/route-paths';
import { EditSubmissionPage2 } from './pages/submission/edit-submission-page2';
import { FileSubmissionManagementPage } from './pages/submission/file-submission-management-page';
import MessageSubmissionManagementPage from './pages/submission/message-submission-management-page';
import SubmissionOutletPage from './pages/submission/submission-outlet-page';
import './styles.css';

function Root() {
  return (
    <EuiErrorBoundary>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
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
            element: <EditSubmissionPage2 />,
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
  <RouterProvider router={router} />
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
