import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter as BrowserRouter } from 'react-router-dom';

import App from './app/app';

ReactDOM.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
  document.getElementById('root')
);
