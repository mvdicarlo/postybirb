/**
 * RemakeApp - Entry point for the remake UI with all providers.
 * Uses state-driven navigation instead of React Router.
 */

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { PageErrorBoundary } from './components/error-boundary';
import { Layout } from './components/layout/layout';
import { I18nProvider } from './providers/i18n-provider';
import { loadAllStores } from './stores';
import './styles/layout.css';
import { cssVariableResolver } from './theme/css-variable-resolver';
import { theme } from './theme/theme';
import './theme/theme-styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Root application component for the remake UI.
 * Includes all necessary providers: Mantine, i18n, and React Query.
 * Uses state-driven navigation via UI store viewState.
 */
export function RemakeApp() {
  useEffect(() => {
    loadAllStores()
      .then(() => {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.log('All stores loaded successfully');
      })
      .catch((error) => {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to load all stores', error);
      });
  }, []);

  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariableResolver} defaultColorScheme="auto">
      <I18nProvider>
        <Notifications zIndex={5000} />
        <QueryClientProvider client={queryClient}>
          <PageErrorBoundary>
            <Layout />
          </PageErrorBoundary>
        </QueryClientProvider>
      </I18nProvider>
    </MantineProvider>
  );
}

// Default export for convenient importing
export default RemakeApp;
