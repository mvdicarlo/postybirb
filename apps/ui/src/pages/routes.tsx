import { Route, Routes as RouterRoutes } from 'react-router-dom';
import HomePage from './home/home-page';
import NotFound from './not-found/not-found';
import { HomePath, SubmissionsPath } from './route-paths';
import SubmissionManagementPage from './submission/submission-management-page';

export default function Routes() {
  return (
    <RouterRoutes>
      <Route path={HomePath} element={<HomePage />} />
      <Route path={SubmissionsPath} element={<SubmissionManagementPage />} />
      <Route element={<NotFound />} />
    </RouterRoutes>
  );
}
