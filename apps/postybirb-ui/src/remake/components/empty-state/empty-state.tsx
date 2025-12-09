/**
 * EmptyState - Reusable empty state component for lists and drawers.
 * Provides a consistent, visually pleasing "no results" experience.
 */

import { Trans } from '@lingui/react/macro';
import { Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBell, IconFolder, IconInbox, IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';

/**
 * Preset types for common empty state scenarios.
 */
export type EmptyStatePreset =
  | 'no-results' // Search returned no results
  | 'no-records' // No data exists yet
  | 'no-selection' // Nothing selected
  | 'no-notifications'; // No notifications

interface EmptyStateProps {
  /** The preset type determines icon and default message */
  preset?: EmptyStatePreset;
  /** Custom icon to override the preset icon */
  icon?: ReactNode;
  /** Primary message (if not using preset default) */
  message?: ReactNode;
  /** Optional secondary helper text */
  description?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Get icon for preset type.
 */
function getPresetIcon(preset: EmptyStatePreset): ReactNode {
  const iconProps = { size: 32, stroke: 1.5 };
  switch (preset) {
    case 'no-results':
      return <IconSearch {...iconProps} />;
    case 'no-records':
      return <IconFolder {...iconProps} />;
    case 'no-notifications':
      return <IconBell {...iconProps} />;
    case 'no-selection':
    default:
      return <IconInbox {...iconProps} />;
  }
}

/**
 * Get default message for preset type.
 */
function getPresetMessage(preset: EmptyStatePreset): ReactNode {
  switch (preset) {
    case 'no-results':
      return <Trans>No results found</Trans>;
    case 'no-records':
      return <Trans>No records yet</Trans>;
    case 'no-notifications':
      return <Trans>No notifications</Trans>;
    case 'no-selection':
    default:
      return <Trans>Nothing selected</Trans>;
  }
}

/**
 * Get sizes for variant.
 */
function getSizes(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return { iconSize: 40, textSize: 'sm' as const, gap: 'xs' as const, py: 'md' as const };
    case 'lg':
      return { iconSize: 64, textSize: 'md' as const, gap: 'md' as const, py: 'xl' as const };
    case 'md':
    default:
      return { iconSize: 48, textSize: 'sm' as const, gap: 'sm' as const, py: 'lg' as const };
  }
}

/**
 * EmptyState component.
 * Use presets for common scenarios, or customize with icon/message/description.
 *
 * @example
 * ```tsx
 * // Using preset
 * <EmptyState preset="no-results" />
 *
 * // Custom message
 * <EmptyState preset="no-records" message={<Trans>No tag groups yet</Trans>} />
 *
 * // Fully custom
 * <EmptyState
 *   icon={<IconTags size={32} />}
 *   message="Create your first tag group"
 *   description="Tag groups help organize your tags"
 * />
 * ```
 */
export function EmptyState({
  preset = 'no-records',
  icon,
  message,
  description,
  size = 'md',
}: EmptyStateProps) {
  const sizes = getSizes(size);
  const displayIcon = icon ?? getPresetIcon(preset);
  const displayMessage = message ?? getPresetMessage(preset);

  return (
    <Center py={sizes.py}>
      <Stack align="center" gap={sizes.gap}>
        <ThemeIcon
          variant="light"
          color="gray"
          size={sizes.iconSize}
          radius="xl"
        >
          {displayIcon}
        </ThemeIcon>
        <Text size={sizes.textSize} c="dimmed" ta="center" fw={500}>
          {displayMessage}
        </Text>
        {description && (
          <Text size="xs" c="dimmed" ta="center" maw={240}>
            {description}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
