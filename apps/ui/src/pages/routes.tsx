import { Route, Routes as RouterRoutes } from 'react-router-dom';
import HomePage from './home/home-page';
import NotFound from './not-found/not-found';
import {
  FileSubmissionPath,
  HomePath,
  MessageSubmissionPath,
} from './route-paths';
import FileSubmissionManagementPage from './submission/file-submission-mannagement-page';
import MessageSubmissionManagementPage from './submission/message-submission-management-page';

export default function Routes() {
  return (
    <RouterRoutes>
      <Route path={HomePath} element={<HomePage />} />
      <Route
        path={MessageSubmissionPath}
        element={<MessageSubmissionManagementPage />}
      />
      <Route
        path={FileSubmissionPath}
        element={<FileSubmissionManagementPage />}
      />
      <Route element={<NotFound />} />
    </RouterRoutes>
  );
}
