import { EuiProvider } from '@elastic/eui';
import { useContext } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppI18nProvider } from './app-i18n-provider';
import AppLayout from './app-layout/app-layout';
import { AppThemeContext } from './app-theme-provider';
import { AppToastProvider } from './app-toast-provider';
import './app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [theme] = useContext(AppThemeContext);
  return (
    <div className="postybirb">
      <EuiProvider colorMode={theme}>
        <AppI18nProvider>
          <QueryClientProvider client={queryClient}>
            <AppToastProvider>
              <AppLayout />
            </AppToastProvider>
          </QueryClientProvider>
        </AppI18nProvider>
      </EuiProvider>
    </div>
  );
}
