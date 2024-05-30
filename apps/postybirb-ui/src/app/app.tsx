import { EuiProvider } from '@elastic/eui';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/spotlight/styles.css';
import { useContext } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppI18nProvider } from './app-i18n-provider';
import { AppThemeContext } from './app-theme-provider';
import { AppToastProvider } from './app-toast-provider';
import './app.css';
import { PostyBirbLayout } from './postybirb-layout/postybirb-layout';

const mantineTheme = createTheme({
  /** Put your mantine theme override here */
});

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
        <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
          <AppI18nProvider>
            <QueryClientProvider client={queryClient}>
              <AppToastProvider>
                <PostyBirbLayout />
              </AppToastProvider>
            </QueryClientProvider>
          </AppI18nProvider>
        </MantineProvider>
      </EuiProvider>
    </div>
  );
}
