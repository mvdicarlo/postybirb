/* eslint-disable lingui/no-unlocalized-strings */
import { MantineProvider, createTheme, rem } from '@mantine/core';
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
  colors: {
    dark: [
      '#C9C9C9',
      '#b8b8b8',
      '#828282',
      '#696969',
      '#424242',
      '#3b3b3b',
      '#292929',
      '#1A1A1A',
      '#131313',
      '#000000',
    ],
  },
  primaryShade: 9,
  shadows: {
    xs: `0 ${rem(3)} ${rem(4)}  rgba(0, 0, 0, 0.2), 0 ${rem(6)} ${rem(
      10
    )} rgba(0, 0, 0, 0.1)`,
  },
  primaryColor: 'green',
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
          <Notifications />
          <QueryClientProvider client={queryClient}>
            <PostyBirbLayout />
          </QueryClientProvider>
        </AppI18nProvider>
      </MantineProvider>
    </div>
  );
}
