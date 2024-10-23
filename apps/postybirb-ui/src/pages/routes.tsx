import { createBrowserRouter } from 'react-router-dom';
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
            {
              path: 'multi-edit/:type',
              element: <MultiEditSubmissionPage />,
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
