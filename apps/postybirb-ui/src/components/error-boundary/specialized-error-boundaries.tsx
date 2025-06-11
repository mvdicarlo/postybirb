/* eslint-disable no-console */
/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';

/**
 * Fallback component for form errors
 */
function FormErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void;
}) {
  return (
    <Alert color="red" title={<Trans>Form Error</Trans>}>
      <Stack gap="sm">
        <Text size="sm">
          <Trans>The form encountered an error and couldn't be displayed properly.</Trans>
        </Text>
        <Button 
          type="button"
          size="sm" 
          leftSection={<IconRefresh size={16} />}
          onClick={retry}
        >
          <Trans>Try again</Trans>
        </Button>
      </Stack>
    </Alert>
  );
}

/**
 * Stable fallback renderer for FormErrorBoundary
 */
const formErrorFallback = (error: Error, errorInfo: { componentStack: string }, retry: () => void) => (
  <FormErrorFallback error={error} retry={retry} />
);

/**
 * Specialized error boundary for page-level components
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        // Log page-level errors to analytics
        console.error('Page Error:', error, errorInfo);
        // Could send to error reporting service
      }}
      resetOnPropsChange
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized error boundary for form components
 */
export function FormErrorBoundary({
  children,
  onError,
}: {
  children: ReactNode;
  onError?: (error: Error) => void;
}) {
  return (
    <ErrorBoundary
      level="section"
      onError={(error, errorInfo) => {
        console.error('Form Error:', error, errorInfo);
        onError?.(error);
      }}
      fallback={formErrorFallback}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized error boundary for individual components
 */
export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      level="component"
      onError={(error, errorInfo) => {
        console.warn('Component Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary that resets when route changes
 */
export function RouteErrorBoundary({
  children,
  routeKey,
}: {
  children: ReactNode;
  routeKey: string;
}) {
  return (
    <ErrorBoundary
      level="page"
      resetKeys={[routeKey]}
      onError={(error, errorInfo) => {
        console.error('Route Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
