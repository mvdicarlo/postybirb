import { Switch, Route } from 'react-router-dom';
import Home from './home/home';
import NotFound from './not-found/not-found';

export default function Routes() {
  return (
    <Switch>
      <Route exact path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}
