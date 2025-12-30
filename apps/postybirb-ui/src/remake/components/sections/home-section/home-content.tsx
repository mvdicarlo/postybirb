/**
 * HomeContent - Main dashboard content for the home view.
 * Displays stats, queue control, and status panels.
 */

import { Trans } from '@lingui/react/macro';
import {
  Center,
  Container,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
  IconCalendar,
  IconFile,
  IconHome,
  IconMessage,
  IconStack2,
} from '@tabler/icons-react';
import { useAccounts } from '../../../stores/account-store';
import {
  useQueuedSubmissions,
  useRegularSubmissions,
  useScheduledSubmissions,
  useSubmissionsByType,
} from '../../../stores/submission-store';
import { useDrawerActions, useViewStateActions } from '../../../stores/ui-store';
import '../../../styles/layout.css';
import {
  createFileSubmissionsViewState,
  createMessageSubmissionsViewState,
} from '../../../types/view-state';
import { AccountHealthPanel } from './account-health-panel';
import { QueueControlCard } from './queue-control-card';
import { RecentActivityPanel } from './recent-activity-panel';
import { ScheduleCalendarPanel } from './schedule-calendar-panel';
import { StatCard } from './stat-card';
import { UpcomingPostsPanel } from './upcoming-posts-panel';
import { ValidationIssuesPanel } from './validation-issues-panel';

/**
 * Empty state for new users with onboarding tips.
 */
function WelcomeEmptyState() {
  return (
    <Center h="100%">
      <Stack align="center" gap="lg" maw={500}>
        <ThemeIcon size={80} variant="light" color="blue" radius="xl">
          <IconHome size={48} stroke={1.5} />
        </ThemeIcon>
        <Title order={2} ta="center">
          <Trans>Welcome to PostyBirb!</Trans>
        </Title>
        <Text size="md" c="dimmed" ta="center">
          <Trans>
            Get started by adding your accounts and creating your first submission.
          </Trans>
        </Text>
        <Stack gap="xs" align="center">
          <Text size="sm" fw={500}>
            <Trans>Quick tips to get started:</Trans>
          </Text>
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              • <Trans>Go to Accounts to add and log into your websites</Trans>
            </Text>
            <Text size="sm" c="dimmed">
              • <Trans>Create a File or Message submission to start posting</Trans>
            </Text>
            <Text size="sm" c="dimmed">
              • <Trans>Use templates to save time on repeated posts</Trans>
            </Text>
            <Text size="sm" c="dimmed">
              • <Trans>Schedule posts to automatically publish at specific times</Trans>
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </Center>
  );
}

/**
 * HomeContent component.
 * Shows dashboard with stats and panels for returning users,
 * or welcome screen for new users.
 */
export function HomeContent() {
  const { setViewState } = useViewStateActions();
  const { openDrawer } = useDrawerActions();
  const regularSubmissions = useRegularSubmissions();
  const accounts = useAccounts();
  const fileSubmissions = useSubmissionsByType(SubmissionType.FILE);
  const messageSubmissions = useSubmissionsByType(SubmissionType.MESSAGE);
  const queuedSubmissions = useQueuedSubmissions();
  const scheduledSubmissions = useScheduledSubmissions();

  // New user detection: no submissions and no accounts
  const isNewUser = regularSubmissions.length === 0 && accounts.length === 0;

  if (isNewUser) {
    return <WelcomeEmptyState />;
  }

  // Filter to only non-template submissions for stats
  const fileCount = fileSubmissions.filter((s) => !s.isTemplate).length;
  const messageCount = messageSubmissions.filter((s) => !s.isTemplate).length;

  return (
    <ScrollArea h="100%" type="hover" scrollbarSize={6}>
      <Container size="xl" py="md">
        <Stack gap="md">
          {/* Header */}
          <Title order={3}>
            <Trans>Dashboard</Trans>
          </Title>

          {/* Stats Row */}
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 5 }} spacing="md">
            <StatCard
              icon={<IconFile size={20} />}
              count={fileCount}
              label={<Trans>File Submissions</Trans>}
              color="blue"
              onClick={() => setViewState(createFileSubmissionsViewState())}
            />
            <StatCard
              icon={<IconMessage size={20} />}
              count={messageCount}
              label={<Trans>Message Submissions</Trans>}
              color="teal"
              onClick={() => setViewState(createMessageSubmissionsViewState())}
            />
            <StatCard
              icon={<IconStack2 size={20} />}
              count={queuedSubmissions.length}
              label={<Trans>Queued</Trans>}
              color="grape"
              onClick={() => openDrawer('schedule')}
            />
            <StatCard
              icon={<IconCalendar size={20} />}
              count={scheduledSubmissions.length}
              label={<Trans>Scheduled</Trans>}
              color="violet"
              onClick={() => openDrawer('schedule')}
            />
            <QueueControlCard />
          </SimpleGrid>

          {/* Panels Row */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <ScheduleCalendarPanel />
            <RecentActivityPanel />
          </SimpleGrid>

          {/* Upcoming Posts & Validation Row */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <UpcomingPostsPanel />
            <ValidationIssuesPanel />
            <AccountHealthPanel />
          </SimpleGrid>
        </Stack>
      </Container>
    </ScrollArea>
  );
}
