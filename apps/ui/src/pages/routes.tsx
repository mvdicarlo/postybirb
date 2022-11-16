import { Route, Routes as RouterRoutes } from 'react-router-dom';
import HomePage from './home/home-page';
import NotFound from './not-found/not-found';
import { HomePath, SubmissionsPath } from './route-paths';
import EditSubmissionPage from './submission/edit-submission-page';
import FileSubmissionManagementPage from './submission/file-submission-mannagement-page';
import MessageSubmissionManagementPage from './submission/message-submission-management-page';
import SubmissionOutletPage from './submission/submission-outlet-page';

export default function Routes() {
  return (
    <RouterRoutes>
      <Route path={HomePath} element={<HomePage />} />
      <Route path={SubmissionsPath} element={<SubmissionOutletPage />}>
        <Route path="message" element={<MessageSubmissionManagementPage />} />
        <Route path="file" element={<FileSubmissionManagementPage />} />
        <Route path="edit/:id" element={<EditSubmissionPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}
