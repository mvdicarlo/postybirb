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
  primaryColor: 'indigo',
  colors: {
    // Soft indigo as primary color
    // indigo: [
    //   '#eef2ff', // 0
    //   '#e0e7ff', // 1
    //   '#c7d2fe', // 2
    //   '#a5b4fc', // 3
    //   '#818cf8', // 4
    //   '#6366f1', // 5
    //   '#4f46e5', // 6
    //   '#4338ca', // 7
    //   '#3730a3', // 8
    //   '#312e81', // 9
    // ],
    // Soft teal as accent color
    teal: [
      '#f0fdfa', // 0
      '#ccfbf1', // 1
      '#99f6e4', // 2
      '#5eead4', // 3
      '#2dd4bf', // 4
      '#14b8a6', // 5
      '#0d9488', // 6
      '#0f766e', // 7
      '#115e59', // 8
      '#134e4a', // 9
    ],
    // Warm amber for highlights
    amber: [
      '#fffbeb', // 0
      '#fef3c7', // 1
      '#fde68a', // 2
      '#fcd34d', // 3
      '#fbbf24', // 4
      '#f59e0b', // 5
      '#d97706', // 6
      '#b45309', // 7
      '#92400e', // 8
      '#78350f', // 9
    ],
    // Enhanced grays with slight blue undertone
    gray: [
      '#f8fafc', // 0
      '#f1f5f9', // 1
      '#e2e8f0', // 2
      '#cbd5e1', // 3
      '#94a3b8', // 4
      '#64748b', // 5
      '#475569', // 6
      '#334155', // 7
      '#1e293b', // 8
      '#0f172a', // 9
    ],
  },
  components: {},
  defaultRadius: 'sm',
  white: '#f1f5f9', // Override pure white with a soft gray
  other: {
    accentColors: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
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
