/**
 * RemakeApp - Entry point for the remake UI with all providers.
 * Uses state-driven navigation instead of React Router.
 */

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import './styles/layout.css';
import './theme/theme-styles.css';

import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Button,
  Center,
  Loader,
  MantineProvider,
  Stack,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Disclaimer } from './components/disclaimer/disclaimer';
import { PageErrorBoundary } from './components/error-boundary';
import { Layout } from './components/layout/layout';
import { TourProvider } from './components/onboarding-tour';
import { I18nProvider } from './providers/i18n-provider';
import { useInitializeStores } from './stores';
import { useColorScheme, usePrimaryColor } from './stores/ui/appearance-store';
import { cssVariableResolver } from './theme/css-variable-resolver';
import { createAppTheme } from './theme/theme';

import './components/website-components/index';

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
function AppContent({
  initialization,
}: {
  initialization: ReturnType<typeof useInitializeStores>;
}) {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useMantineColorScheme();
  const { isInitialized, isLoading, error, retry } = initialization;

  // Sync our store's colorScheme with Mantine's colorScheme
  useEffect(() => {
    setColorScheme(colorScheme);
  }, [colorScheme, setColorScheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <PageErrorBoundary>
        {isLoading ? (
          <Center mih="100vh">
            <Stack align="center" gap="sm">
              <Loader />
              <Text c="dimmed">
                <Trans>Loading application data...</Trans>
              </Text>
            </Stack>
          </Center>
        ) : error ? (
          <Center mih="100vh" p="md">
            <Alert
              icon={<IconAlertCircle size={20} />}
              title={<Trans>Application data could not be loaded</Trans>}
              color="red"
              maw={600}
            >
              <Stack gap="sm">
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {error}
                </Text>
                <Button
                  onClick={retry}
                  variant="light"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Trans>Try again</Trans>
                </Button>
              </Stack>
            </Alert>
          </Center>
        ) : isInitialized ? (
          <TourProvider>
            <Layout />
          </TourProvider>
        ) : null}
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
  const initialization = useInitializeStores();

  // Create theme with dynamic primary color
  const dynamicTheme = useMemo(
    () => createAppTheme(primaryColor),
    [primaryColor],
  );

  return (
    <MantineProvider
      theme={dynamicTheme}
      cssVariablesResolver={cssVariableResolver}
      defaultColorScheme="auto"
    >
      <I18nProvider>
        <Notifications zIndex="var(--z-notification)" />
        <Disclaimer>
          <AppContent initialization={initialization} />
        </Disclaimer>
      </I18nProvider>
    </MantineProvider>
  );
}

export default PostyBirb;
