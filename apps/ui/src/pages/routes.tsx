import { Route, Switch } from 'react-router-dom';
import HomePage from './home/home-page';
import NotFound from './not-found/not-found';
import { HomePath, SubmissionsPath } from './route-paths';
import SubmissionManagementPage from './submission/submission-management-page';

export default function Routes() {
  return (
    <Switch>
      <Route exact path={HomePath} component={HomePage} />
      <Route
        exact
        path={SubmissionsPath}
        component={SubmissionManagementPage}
      />
      <Route component={NotFound} />
    </Switch>
  );
}
