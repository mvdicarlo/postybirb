import { createBrowserRouter } from 'react-router-dom';
import { PageErrorBoundary } from '../components/error-boundary/specialized-error-boundaries';
import HomePage from './home/home-page';
import NotFound from './not-found/not-found';
import { SubmissionsPath } from './route-paths';
import { EditSubmissionPage } from './submission/edit-submission-page';
import { FileSubmissionManagementPage } from './submission/file-submission-management-page';
import MessageSubmissionManagementPage from './submission/message-submission-management-page';
import { MultiEditSubmissionPage } from './submission/multi-edit-submission-page';
import SubmissionOutletPage from './submission/submission-outlet-page';

export const CreateRouter = (root: JSX.Element) =>
  createBrowserRouter([
    {
      path: '/',
      element: root,
      children: [
        {
          path: '',
          element: (
            <PageErrorBoundary>
              <HomePage />
            </PageErrorBoundary>
          ),
        },
        {
          path: SubmissionsPath,
          element: (
            <PageErrorBoundary>
              <SubmissionOutletPage />
            </PageErrorBoundary>
          ),
          children: [
            {
              path: 'message',
              element: (
                <PageErrorBoundary>
                  <MessageSubmissionManagementPage />
                </PageErrorBoundary>
              ),
            },
            {
              path: 'file',
              element: (
                <PageErrorBoundary>
                  <FileSubmissionManagementPage />
                </PageErrorBoundary>
              ),
            },
            {
              path: 'edit/:id',
              element: (
                <PageErrorBoundary>
                  <EditSubmissionPage />
                </PageErrorBoundary>
              ),
            },
            {
              path: 'multi-edit/:type',
              element: (
                <PageErrorBoundary>
                  <MultiEditSubmissionPage />
                </PageErrorBoundary>
              ),
            },
          ],
        },
      ],
    },
    {
      path: '*',
      element: (
        <PageErrorBoundary>
          <NotFound />
        </PageErrorBoundary>
      ),
    },
  ]);
