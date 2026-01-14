/**
 * StatCard - Reusable stat card for dashboard metrics.
 * Shows an icon, count, and label with optional click navigation.
 */

import type { MantineColor } from '@mantine/core';
import {
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import type { ReactNode } from 'react';
import { cn } from '../../../utils/class-names';

interface StatCardProps {
  /** Icon to display */
  icon: ReactNode;
  /** Numeric count to display */
  count: number;
  /** Label describing the stat */
  label: ReactNode;
  /** Theme color for the icon */
  color?: MantineColor;
  /** Click handler - if provided, card becomes clickable with hover effect */
  onClick?: () => void;
}

/**
 * StatCard component for displaying dashboard metrics.
 * Becomes clickable with hover effect when onClick is provided.
 */
export function StatCard({
  icon,
  count,
  label,
  color = 'blue',
  onClick,
}: StatCardProps) {
  const content = (
    <Paper
      h="100%"
      withBorder
      p="md"
      radius="md"
      className={cn(['postybirb__stat-card'], {
        'postybirb__stat-card--clickable': !!onClick,
      })}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xl" fw={700} lh={1}>
            {count}
          </Text>
          <Text size="sm" c="dimmed" lh={1.2}>
            {label}
          </Text>
        </Stack>
        <ThemeIcon size="lg" variant="light" color={color} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );

  if (onClick) {
    return (
      <UnstyledButton
        onClick={onClick}
        style={{ display: 'block', width: '100%' }}
        className="postybirb__stat-card-button"
      >
        {content}
      </UnstyledButton>
    );
  }

  return content;
}
