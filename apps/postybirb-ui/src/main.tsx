import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './app/app';
import AppThemeProvider from './app/app-theme-provider';
import { SubmissionsPath } from './pages/route-paths';
import MessageSubmissionManagementPage from './pages/submission/message-submission-management-page';
import FileSubmissionManagementPage from './pages/submission/file-submission-management-page';
import EditSubmissionPage from './pages/submission/edit-submission-page';
import SubmissionOutletPage from './pages/submission/submission-outlet-page';
import NotFound from './pages/not-found/not-found';
import HomePage from './pages/home/home-page';

// TODO react 18
// const container = document.getElementById('app');
// const root = createRoot(container); // createRoot(container!) if you use TypeScript
// root.render(<App tab="home" />);

function Root() {
  return (
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
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

ReactDOM.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
  document.getElementById('root')
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
