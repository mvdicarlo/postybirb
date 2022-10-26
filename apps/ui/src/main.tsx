import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter as BrowserRouter } from 'react-router-dom';
import App from './app/app';
import AppThemeProvider from './app/app-theme-provider';
import './modules/action-history/action-history';

// TODO react 18
// const container = document.getElementById('app');
// const root = createRoot(container); // createRoot(container!) if you use TypeScript
// root.render(<App tab="home" />);

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

declare global {
  interface Window {
    electron: {
      getAppVersion(): Promise<string>;
      platform: string;
      app_port: string;
      app_version: string;
    };
  }
}
