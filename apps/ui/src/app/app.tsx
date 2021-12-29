import { EuiProvider } from '@elastic/eui';
import { useContext } from 'react';
import AppIntlProvider from './app-intl-provider';
import AppLayout from './app-layout';
import { AppThemeContext } from './app-theme-provider';

export function App() {
  const [theme] = useContext(AppThemeContext);
  return (
    <div className="postybirb">
      <EuiProvider colorMode={theme}>
        <AppIntlProvider>
          <AppLayout />
        </AppIntlProvider>
      </EuiProvider>
    </div>
  );
}

export default App;
