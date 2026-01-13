/**
 * RemakeApp - Entry point for the remake UI with all providers.
 * Uses state-driven navigation instead of React Router.
 */

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider, useMantineColorScheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Disclaimer } from './components/disclaimer/disclaimer';
import { PageErrorBoundary } from './components/error-boundary';
import { Layout } from './components/layout/layout';
import { I18nProvider } from './providers/i18n-provider';
import { loadAllStores } from './stores';
import { useColorScheme, usePrimaryColor } from './stores/ui/appearance-store';
import './styles/layout.css';
import { cssVariableResolver } from './theme/css-variable-resolver';
import { createAppTheme } from './theme/theme';
import './theme/theme-styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Inner app component that uses the color scheme from state.
 * Must be inside MantineProvider to use useMantineColorScheme.
 */
function AppContent() {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useMantineColorScheme();

  // Sync our store's colorScheme with Mantine's colorScheme
  useEffect(() => {
    setColorScheme(colorScheme);
  }, [colorScheme, setColorScheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <PageErrorBoundary>
        <Layout />
      </PageErrorBoundary>
    </QueryClientProvider>
  );
}

/**
 * Root application component for the remake UI.
 * Includes all necessary providers: Mantine, i18n, and React Query.
 * Uses state-driven navigation via UI store viewState.
 */
export function PostyBirb() {
  const primaryColor = usePrimaryColor();

  // Create theme with dynamic primary color
  const dynamicTheme = useMemo(
    () => createAppTheme(primaryColor),
    [primaryColor],
  );

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
    <MantineProvider
      theme={dynamicTheme}
      cssVariablesResolver={cssVariableResolver}
      defaultColorScheme="auto"
    >
      <I18nProvider>
        <Notifications zIndex="var(--z-notification)" />
        <Disclaimer>
          <AppContent />
        </Disclaimer>
      </I18nProvider>
    </MantineProvider>
  );
}

export default PostyBirb;
