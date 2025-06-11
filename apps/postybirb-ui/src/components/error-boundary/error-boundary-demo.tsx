/* eslint-disable no-console */
/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import {
    ComponentErrorBoundary,
    FormErrorBoundary,
    NotificationErrorBoundary,
    SilentErrorBoundary,
    useAsyncErrorHandler,
    useErrorThrower,
} from '.';

/**
 * Component that throws an error when clicked
 */
function ErrorThrower({ message }: { message: string }) {
  const [shouldThrow, setShouldThrow] = useState(false);
  
  if (shouldThrow) {
    throw new Error(message);
  }
  
  return (
    <Button 
      color="red" 
      onClick={() => setShouldThrow(true)}
    >
      <Trans>Throw Error: {message}</Trans>
    </Button>
  );
}

/**
 * Component that demonstrates async error handling
 */
function AsyncErrorDemo() {
  const handleAsyncError = useAsyncErrorHandler();
  const throwError = useErrorThrower();
  
  const simulateAsyncError = async () => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Async operation failed')), 1000);
      });
    } catch (error) {
      handleAsyncError(error as Error);
    }
  };
  
  return (
    <Group gap="sm">
      <Button onClick={simulateAsyncError}>
        <Trans>Simulate Async Error</Trans>
      </Button>
      <Button onClick={() => throwError('Manual error')}>
        <Trans>Throw Manual Error</Trans>
      </Button>
    </Group>
  );
}

/**
 * Demo component for testing different error boundary types
 * This would typically be used in a development/testing page
 */
export function ErrorBoundaryDemo() {
  return (
    <Stack gap="lg" p="md">
      <Title order={2}>
        <Trans>Error Boundary Demo</Trans>
      </Title>
      
      <Text c="dimmed">
        <Trans>
          This demo shows different types of error boundaries in action. 
          Click the buttons to test error handling.
        </Trans>
      </Text>
      
      {/* Component Error Boundary Demo */}
      <Card withBorder>
        <Title order={4} mb="sm">
          <Trans>Component Error Boundary</Trans>
        </Title>
        <ComponentErrorBoundary>
          <ErrorThrower message="Component error" />
        </ComponentErrorBoundary>
      </Card>
      
      {/* Form Error Boundary Demo */}
      <Card withBorder>
        <Title order={4} mb="sm">
          <Trans>Form Error Boundary</Trans>
        </Title>        <FormErrorBoundary onError={(error) => console.log('Form error callback:', error)}>
          <ErrorThrower message="Form error" />
        </FormErrorBoundary>
      </Card>
      
      {/* Notification Error Boundary Demo */}
      <Card withBorder>
        <Title order={4} mb="sm">
          <Trans>Notification Error Boundary</Trans>
        </Title>
        <NotificationErrorBoundary 
          notificationTitle={<Trans>Demo Error</Trans>}
          showNotification
        >
          <ErrorThrower message="Notification error" />
        </NotificationErrorBoundary>
      </Card>
      
      {/* Silent Error Boundary Demo */}
      <Card withBorder>
        <Title order={4} mb="sm">
          <Trans>Silent Error Boundary</Trans>
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          <Trans>This component will fail silently (check console for logs)</Trans>
        </Text>
        <Group>
          <SilentErrorBoundary>
            <ErrorThrower message="Silent error" />
          </SilentErrorBoundary>
          <Text>
            <Trans>This text should remain visible even after error</Trans>
          </Text>
        </Group>
      </Card>
      
      {/* Async Error Demo */}
      <Card withBorder>
        <Title order={4} mb="sm">
          <Trans>Async Error Handling</Trans>
        </Title>
        <ComponentErrorBoundary>
          <AsyncErrorDemo />
        </ComponentErrorBoundary>
      </Card>
    </Stack>
  );
}
