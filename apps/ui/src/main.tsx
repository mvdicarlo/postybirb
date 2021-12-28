import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter as BrowserRouter } from 'react-router-dom';

import App from './app/app';
import AppThemeProvider from './app/app-theme-provider';

ReactDOM.render(
  <StrictMode>
    <BrowserRouter>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </BrowserRouter>
  </StrictMode>,
  document.getElementById('root')
);
