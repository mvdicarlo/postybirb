import { Trans } from '@lingui/macro';
import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCalendar, IconClock, IconFileText } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  title: ReactNode;
  value: number | string;
}

function StatCard({ icon, title, value }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group gap="xs">
        {icon}
        <div>
          <Text size="xs" c="dimmed">
            {title}
          </Text>
          <Title order={4}>{value}</Title>
        </div>
      </Group>
    </Paper>
  );
}

export interface DashboardStatsProps {
  numSubmissions: number;
  numScheduled: number;
  numInQueue: number;
}

export function DashboardStats({
  numSubmissions,
  numScheduled,
  numInQueue,
}: DashboardStatsProps) {
  return (
    <Stack gap="md">
      <Group grow>
        <StatCard
          icon={<IconFileText size={20} />}
          title={<Trans>Total Submissions</Trans>}
          value={numSubmissions}
        />
        <StatCard
          icon={<IconCalendar size={20} />}
          title={<Trans>Scheduled</Trans>}
          value={numScheduled}
        />
        <StatCard
          icon={<IconClock size={20} />}
          title={<Trans>In Queue</Trans>}
          value={numInQueue}
        />
      </Group>
    </Stack>
  );
}
