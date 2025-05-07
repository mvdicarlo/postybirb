import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppI18nProvider } from './app-i18n-provider';
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
  return (
    <div className="postybirb">
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <AppI18nProvider>
          {/* Make notifications visible above modals */}
          <Notifications zIndex={5000} />

          <QueryClientProvider client={queryClient}>
            <PostyBirbLayout />
          </QueryClientProvider>
        </AppI18nProvider>
      </MantineProvider>
    </div>
  );
}
