/* eslint-disable lingui/no-unlocalized-strings */
/* eslint-disable react/sort-comp */
/* eslint-disable no-console */
import { Trans } from '@lingui/macro';
import {
    Alert,
    Box,
    Button,
    Container,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: { componentStack: string };
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (
    error: Error,
    errorInfo: { componentStack: string },
    retry: () => void,
  ) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  level?: 'page' | 'section' | 'component';
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    // eslint-disable-next-line react/destructuring-assignment
    this.props.onError?.(error, errorInfo);

    // Log error to any external error reporting service
    // Example: Sentry, LogRocket, etc.
    // logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index],
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary when any props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    }, 100);
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, level = 'section' } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback && errorInfo) {
        return fallback(error, errorInfo, this.resetErrorBoundary);
      }

      // Default fallback UI based on level
      return this.renderDefaultFallback(error, level);
    }

    return children;
  }

  private renderDefaultFallback(error: Error, level: string) {
    const isComponentLevel = level === 'component';
    const AlertComponent = isComponentLevel ? Alert : Container;

    if (isComponentLevel) {
      return (
        <Alert
          color="red"
          title={<Trans>Something went wrong</Trans>}
          icon={<IconAlertTriangle size={16} />}
        >
          <Stack gap="sm">
            <Text size="sm">
              <Trans>
                This component encountered an error and couldn't render
                properly.
              </Trans>
            </Text>
            <Button
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={this.resetErrorBoundary}
            >
              <Trans>Try again</Trans>
            </Button>
          </Stack>
        </Alert>
      );
    }

    return (
      <AlertComponent>
        <Box ta="center" py="xl">
          <Stack align="center" gap="lg">
            <IconAlertTriangle size={48} color="var(--mantine-color-red-5)" />

            <div>
              <Title order={2} mb="sm">
                <Trans>Something went wrong</Trans>
              </Title>
              <Text c="dimmed" mb="lg">
                <Trans>
                  We encountered an unexpected error. Please try refreshing the
                  page.
                </Trans>
              </Text>
            </div>

            <Stack gap="sm">
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={this.resetErrorBoundary}
              >
                <Trans>Try again</Trans>
              </Button>

              <Button variant="subtle" onClick={() => window.location.reload()}>
                <Trans>Reload page</Trans>
              </Button>
            </Stack>

            {process.env.NODE_ENV === 'development' && (
              <Alert color="gray" mt="xl">
                <Text size="xs" ff="monospace">
                  {error.message}
                </Text>
                {error.stack && (
                  <Text size="xs" ff="monospace" mt="xs">
                    {error.stack}
                  </Text>
                )}
              </Alert>
            )}
          </Stack>
        </Box>
      </AlertComponent>
    );
  }
}
