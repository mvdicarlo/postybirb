/**
 * HomePage - Demo section for the Home navigation item.
 */

import { Trans } from '@lingui/macro';
import { Paper, Stack, Text, Title } from '@mantine/core';

/**
 * Home page demo component.
 * Displays placeholder content for the home section.
 */
export function HomePage() {
  return (
    <Stack gap="md">
      <Title order={2}>
        <Trans>Home</Trans>
      </Title>
      <Paper p="md" withBorder>
        <Text>
          <Trans>
            Welcome to PostyBirb! This is the home section where you can see an
            overview of your activity.
          </Trans>
        </Text>
      </Paper>
      <Paper p="md" withBorder>
        <Title order={4}>
          <Trans>Recent Activity</Trans>
        </Title>
        <Text c="dimmed" mt="sm">
          <Trans>No recent activity to display.</Trans>
        </Text>
      </Paper>
    </Stack>
  );
}
