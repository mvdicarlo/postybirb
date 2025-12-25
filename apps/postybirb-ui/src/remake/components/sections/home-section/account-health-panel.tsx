/**
 * AccountHealthPanel - Panel showing account login status overview.
 * Displays logged in vs total accounts with warning indicators.
 */

import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { IconUsers, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useAccounts } from '../../../stores/account-store';
import { useViewStateActions } from '../../../stores/ui-store';
import { createAccountsViewState } from '../../../types/view-state';
import { EmptyState } from '../../empty-state';

/**
 * AccountHealthPanel component.
 * Shows a summary of account login states.
 */
export function AccountHealthPanel() {
  const accounts = useAccounts();
  const { setViewState } = useViewStateActions();

  const handleNavigateToAccounts = () => {
    setViewState(createAccountsViewState());
  };

  const totalAccounts = accounts.length;
  const loggedInAccounts = accounts.filter((a) => a.isLoggedIn).length;
  const loggedOutAccounts = totalAccounts - loggedInAccounts;
  const healthPercentage = totalAccounts > 0 ? (loggedInAccounts / totalAccounts) * 100 : 0;

  const allHealthy = loggedOutAccounts === 0 && totalAccounts > 0;
  const hasIssues = loggedOutAccounts > 0;

  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon
              size="md"
              variant="light"
              color={allHealthy ? 'green' : hasIssues ? 'orange' : 'gray'}
              radius="md"
            >
              <IconUsers size={16} />
            </ThemeIcon>
            <Text size="sm" fw={500}>
              <Trans>Account Status</Trans>
            </Text>
          </Group>
          <UnstyledButton onClick={handleNavigateToAccounts}>
            <Text size="xs" c="dimmed" style={{ textDecoration: 'underline' }}>
              <Trans>Manage accounts</Trans>
            </Text>
          </UnstyledButton>
        </Group>

        {totalAccounts === 0 ? (
          <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <EmptyState
              preset="no-records"
              message={<Trans>No accounts added</Trans>}
              description={<Trans>Add an account to start posting</Trans>}
              size="sm"
            />
          </Box>
        ) : (
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm">
                <Text component="span" fw={700} size="lg">
                  {loggedInAccounts}
                </Text>
                <Text component="span" c="dimmed">
                  {' '}/ {totalAccounts} <Trans>logged in</Trans>
                </Text>
              </Text>
              {allHealthy ? (
                <Badge color="green" variant="light" size="sm" leftSection={<IconCircleCheck size={12} />}>
                  <Trans>All healthy</Trans>
                </Badge>
              ) : hasIssues ? (
                <Badge color="orange" variant="light" size="sm" leftSection={<IconAlertCircle size={12} />}>
                  {loggedOutAccounts} <Trans>need attention</Trans>
                </Badge>
              ) : null}
            </Group>

            <Progress
              value={healthPercentage}
              color={allHealthy ? 'green' : hasIssues ? 'orange' : 'gray'}
              size="sm"
              radius="xl"
            />

            {hasIssues && (
              <Text size="xs" c="dimmed">
                <Trans>Some accounts need to be logged in before you can post to them.</Trans>
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
