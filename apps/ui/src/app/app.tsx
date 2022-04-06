import { EuiProvider } from '@elastic/eui';
import { useContext } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import AppIntlProvider from './app-intl-provider';
import AppLayout from './app-layout';
import { AppThemeContext } from './app-theme-provider';

const queryClient = new QueryClient();

export default function App() {
  const [theme] = useContext(AppThemeContext);
  return (
    <div className="postybirb">
      <EuiProvider colorMode={theme}>
        <QueryClientProvider client={queryClient}>
          <AppIntlProvider>
            <AppLayout />
          </AppIntlProvider>
        </QueryClientProvider>
      </EuiProvider>
    </div>
  );
}
