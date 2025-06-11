/* eslint-disable no-console */
/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import { notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';

/**
 * Error boundary that integrates with the Mantine notifications system
 * Shows user-friendly notifications when errors occur
 */
export function NotificationErrorBoundary({ 
  children,
  showNotification = true,
  notificationTitle,
  level = 'section'
}: { 
  children: ReactNode;
  showNotification?: boolean;
  notificationTitle?: ReactNode;
  level?: 'page' | 'section' | 'component';
}) {
  return (
    <ErrorBoundary
      level={level}
      onError={(error, errorInfo) => {
        console.error('Error caught by NotificationErrorBoundary:', error, errorInfo);
        
        if (showNotification) {
          notifications.show({
            title: notificationTitle || <Trans>Something went wrong</Trans>,
            message: error.message || <Trans>An unexpected error occurred</Trans>,
            color: 'red',
            autoClose: 5000,
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Silent error boundary that only logs errors without showing UI fallback
 * Useful for non-critical components where you want the app to continue functioning
 */
export function SilentErrorBoundary({ 
  children,
  onError
}: { 
  children: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}) {
  return (
    <ErrorBoundary
      level="component"
      onError={(error, errorInfo) => {
        console.warn('Silent error boundary caught error:', error, errorInfo);
        onError?.(error, errorInfo);
      }}
      fallback={() => null} // Return nothing, effectively hiding the error
    >
      {children}
    </ErrorBoundary>
  );
}
