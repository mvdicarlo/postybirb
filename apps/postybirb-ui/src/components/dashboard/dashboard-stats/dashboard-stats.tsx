import { Trans } from '@lingui/macro';
import {
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Transition,
} from '@mantine/core';
import { IconCalendar, IconClock, IconFileText } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';

interface StatCardProps {
  icon: ReactNode;
  title: ReactNode;
  value: number | string;
  color: string;
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Transition mounted transition="scale" duration={200}>
      {(styles) => (
        <Paper
          withBorder
          p="lg"
          radius="xl"
          shadow={hovered ? 'lg' : 'md'}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            ...styles,
            cursor: 'default',
            transform: hovered ? 'translateY(-2px)' : 'translateY(0px)',
            transition: 'all 0.2s ease',
            background: hovered
              ? `linear-gradient(135deg, var(--mantine-color-${color}-0) 0%, var(--mantine-color-${color}-1) 100%)`
              : undefined,
          }}
        >
          <Stack gap="md" align="center">
            <ThemeIcon
              size="xl"
              radius="xl"
              variant={hovered ? 'filled' : 'light'}
              color={color}
              style={{
                transition: 'all 0.2s ease',
              }}
            >
              {icon}
            </ThemeIcon>
            <Box ta="center">
              <Title
                order={2}
                style={{
                  background: `linear-gradient(135deg, var(--mantine-color-${color}-6), var(--mantine-color-${color}-4))`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 700,
                }}
              >
                {value}
              </Title>
              <Text size="sm" c="dimmed" fw={500} mt={4}>
                {title}
              </Text>
            </Box>
          </Stack>
        </Paper>
      )}
    </Transition>
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
    <Stack gap="xl">
      <Group grow justify="center">
        <StatCard
          icon={<IconFileText size={24} />}
          title={<Trans>Total Submissions</Trans>}
          value={numSubmissions}
          color="blue"
        />
        <StatCard
          icon={<IconCalendar size={24} />}
          title={<Trans>Scheduled</Trans>}
          value={numScheduled}
          color="violet"
        />
        <StatCard
          icon={<IconClock size={24} />}
          title={<Trans>In Queue</Trans>}
          value={numInQueue}
          color="teal"
        />
      </Group>
    </Stack>
  );
}
