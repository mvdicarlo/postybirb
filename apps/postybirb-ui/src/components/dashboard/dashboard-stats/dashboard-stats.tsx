import { Trans } from "@lingui/react/macro";
import {
  Badge,
  Box,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconCalendar,
  IconClock,
  IconFile,
  IconFileText,
  IconMessage,
} from '@tabler/icons-react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSubmissionPath, MessageSubmissionPath } from '../../../pages/route-paths';
import classes from './dashboard-stats.module.css';

interface SubmissionBreakdown {
  files: number;
  messages: number;
}

interface StatCardProps {
  icon: ReactNode;
  title: ReactNode;
  value: number | string;
  color: string;
  children?: ReactNode;
  highlight?: boolean;
}

function StatCard({
  icon,
  title,
  value,
  color,
  children,
  highlight,
}: StatCardProps) {
  // Define a gradient for each color
  const gradients: Record<string, { from: string; to: string; deg: number }> = {
    blue: { from: 'blue.5', to: 'cyan.5', deg: 135 },
    violet: { from: 'violet.5', to: 'grape.5', deg: 135 },
    teal: { from: 'teal.5', to: 'green.5', deg: 135 },
  };
  const gradient = gradients[color] || { from: 'blue.5', to: 'cyan.5', deg: 135 };
  return (
    <Paper
      className={
        highlight
          ? `${classes.statCard} ${classes.statCardHighlight}`
          : classes.statCard
      }
      shadow={highlight ? 'xl' : 'md'}
      radius="xl"
      withBorder
    >
      <Stack gap={0} align="center" className={classes.statCardContent}>
        <ThemeIcon
          size={56}
          radius="xl"
          variant="gradient"
          gradient={gradient}
          className={classes.statIcon}
        >
          {icon}
        </ThemeIcon>
        <Title order={2} className={classes.valueText}>
          {value}
        </Title>
        <Text size="md" className={classes.titleText}>
          {title}
        </Text>
        {children}
      </Stack>
    </Paper>
  );
}

export interface DashboardStatsProps {
  numSubmissions: number;
  numScheduled: number;
  numInQueue: number;
  submissionBreakdown?: SubmissionBreakdown;
  scheduledBreakdown?: SubmissionBreakdown;
  queueBreakdown?: SubmissionBreakdown;
}

export function DashboardStats({
  numSubmissions,
  numScheduled,
  numInQueue,
  submissionBreakdown,
  scheduledBreakdown,
  queueBreakdown,
}: DashboardStatsProps) {
  const navigate = useNavigate();
  return (
    <Grid gutter="xl" className={classes.statsGrid}>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <StatCard
          icon={<IconFileText size={36} />}
          title={<Trans>Total Submissions</Trans>}
          value={numSubmissions}
          color="blue"
        >
          {submissionBreakdown && (
            <Group justify="center" gap="xs" className={classes.breakdownRow}>
              <Box className={classes.breakdownBox} style={{ cursor: 'pointer' }} onClick={() => navigate(FileSubmissionPath)}>
                <ThemeIcon size={24} radius="xl" color="blue" variant="light">
                  <IconFile size={16} />
                </ThemeIcon>
                <Text size="xs" className={classes.breakdownLabel}>
                  <Trans>Files</Trans>
                </Text>
                <Badge color="blue" variant="light" size="lg" radius="xl" mt={2}>
                  {submissionBreakdown.files}
                </Badge>
              </Box>
              <Box className={classes.breakdownBox} style={{ cursor: 'pointer' }} onClick={() => navigate(MessageSubmissionPath)}>
                <ThemeIcon size={24} radius="xl" color="green" variant="light">
                  <IconMessage size={16} />
                </ThemeIcon>
                <Text size="xs" className={classes.breakdownLabel}>
                  <Trans>Messages</Trans>
                </Text>
                <Badge color="green" variant="light" size="lg" radius="xl" mt={2}>
                  {submissionBreakdown.messages}
                </Badge>
              </Box>
            </Group>
          )}
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <StatCard
          icon={<IconCalendar size={36} />}
          title={<Trans>Scheduled</Trans>}
          value={numScheduled}
          color="violet"
        >
          {scheduledBreakdown && (
            <Group justify="center" gap="xs" className={classes.breakdownRow}>
              <Box className={classes.breakdownBox} style={{ cursor: 'pointer' }} onClick={() => navigate(FileSubmissionPath)}>
                <ThemeIcon size={24} radius="xl" color="blue" variant="light">
                  <IconFile size={16} />
                </ThemeIcon>
                <Text size="xs" className={classes.breakdownLabel}>
                  <Trans>Files</Trans>
                </Text>
                <Badge color="blue" variant="light" size="lg" radius="xl" mt={2}>
                  {scheduledBreakdown.files}
                </Badge>
              </Box>
              <Box className={classes.breakdownBox} style={{ cursor: 'pointer' }} onClick={() => navigate(MessageSubmissionPath)}>
                <ThemeIcon size={24} radius="xl" color="green" variant="light">
                  <IconMessage size={16} />
                </ThemeIcon>
                <Text size="xs" className={classes.breakdownLabel}>
                  <Trans>Messages</Trans>
                </Text>
                <Badge color="green" variant="light" size="lg" radius="xl" mt={2}>
                  {scheduledBreakdown.messages}
                </Badge>
              </Box>
            </Group>
          )}
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <StatCard
          icon={<IconClock size={36} />}
          title={<Trans>In Queue</Trans>}
          value={numInQueue}
          color="teal"
        >
          {queueBreakdown && (
            <Group justify="center" gap="xs" className={classes.breakdownRow}>
              <Box className={classes.breakdownBox} style={{ cursor: 'pointer' }} onClick={() => navigate(FileSubmissionPath)}>
                <ThemeIcon size={24} radius="xl" color="blue" variant="light">
                  <IconFile size={16} />
                </ThemeIcon>
                <Text size="xs" className={classes.breakdownLabel}>
                  <Trans>Files</Trans>
                </Text>
                <Badge color="blue" variant="light" size="lg" radius="xl" mt={2}>
                  {queueBreakdown.files}
                </Badge>
              </Box>
              <Box className={classes.breakdownBox} style={{ cursor: 'pointer' }} onClick={() => navigate(MessageSubmissionPath)}>
                <ThemeIcon size={24} radius="xl" color="green" variant="light">
                  <IconMessage size={16} />
                </ThemeIcon>
                <Text size="xs" className={classes.breakdownLabel}>
                  <Trans>Messages</Trans>
                </Text>
                <Badge color="green" variant="light" size="lg" radius="xl" mt={2}>
                  {queueBreakdown.messages}
                </Badge>
              </Box>
            </Group>
          )}
        </StatCard>
      </Grid.Col>
    </Grid>
  );
}
