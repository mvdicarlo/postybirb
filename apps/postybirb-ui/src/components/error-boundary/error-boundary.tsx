/* eslint-disable lingui/no-unlocalized-strings */
/* eslint-disable react/sort-comp */
/* eslint-disable no-console */
import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Code,
  Container,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconRefresh,
} from '@tabler/icons-react';
import { Component, ReactNode, useState } from 'react';

/**
 * Copyable error details component
 */
function CopyableErrorDetails({
  error,
  errorInfo,
}: {
  error: Error;
  errorInfo?: { componentStack: string };
}) {
  const [copied, setCopied] = useState(false);

  // Extract the component name from the component stack
  const getComponentName = (componentStack?: string): string | null => {
    if (!componentStack) return null;

    // Component stack format typically looks like:
    //     in ComponentName (at file.tsx:123)
    //     in AnotherComponent (at file.tsx:456)
    const lines = componentStack.trim().split('\n');
    const firstComponentLine = lines.find((line) =>
      line.trim().startsWith('in '),
    );

    if (firstComponentLine) {
      const match = firstComponentLine.trim().match(/^in (\w+)/);
      return match ? match[1] : null;
    }

    return null;
  };

  const componentName = getComponentName(errorInfo?.componentStack);

  const copyErrorToClipboard = async () => {
    const errorDetails = [
      `Error: ${error.message}`,
      componentName ? `Component: ${componentName}` : '',
      '',
      'Stack Trace:',
      error.stack || 'No stack trace available',
      '',
      'Component Stack:',
      errorInfo?.componentStack || 'No component stack available',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <Box mt="sm">
      <Stack gap="xs">
        <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text size="xs" fw={500}>
            <Trans>Error Details:</Trans>
          </Text>
          <Tooltip
            label={
              copied ? (
                <Trans>Copied!</Trans>
              ) : (
                <Trans>Copy error details</Trans>
              )
            }
          >
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={copyErrorToClipboard}
              color={copied ? 'green' : 'gray'}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        </Box>

        <ScrollArea.Autosize mah={120}>
          <Code
            block
            p="xs"
            fs="xs"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            <Text span c="red" fw={500}>
              {error.message}
            </Text>

            {componentName && (
              <>
                {'\n\n'}
                <Text span c="blue" fw={500}>
                  Component: {componentName}
                </Text>
              </>
            )}

            {error.stack && (
              <>
                {'\n\n'}
                <Text span c="dimmed" size="xs">
                  {error.stack}
                </Text>
              </>
            )}

            {errorInfo?.componentStack && (
              <>
                {'\n\n'}
                <Text span c="grape" fw={500} size="xs">
                  Component Stack:
                </Text>
                {'\n'}
                <Text span c="dimmed" size="xs">
                  {errorInfo.componentStack}
                </Text>
              </>
            )}
          </Code>
        </ScrollArea.Autosize>
      </Stack>
    </Box>
  );
}

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
      return this.renderDefaultFallback(error, level, errorInfo);
    }

    return children;
  }

  private renderDefaultFallback(
    error: Error,
    level: string,
    errorInfo?: { componentStack: string },
  ) {
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

            <CopyableErrorDetails error={error} errorInfo={errorInfo} />

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
