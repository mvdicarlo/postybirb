/**
 * SubmissionEditCardHeader - Header component for the submission edit card.
 * Displays title, archived badge, and expand/collapse chevron.
 */

import { Trans } from '@lingui/react/macro';
import { Badge, Box, Group, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useSubmissionEditCardContext } from '../context';

export interface SubmissionEditCardHeaderProps {
  /** Whether the card is expanded (controls chevron direction) */
  isExpanded?: boolean;
}

/**
 * Header component for the submission edit card.
 * Shows expand/collapse chevron, title, and archived badge.
 */
export function SubmissionEditCardHeader({
  isExpanded = true,
}: SubmissionEditCardHeaderProps) {
  const { submission, isCollapsible } = useSubmissionEditCardContext();

  const ChevronIcon = isExpanded ? IconChevronDown : IconChevronRight;

  return (
    <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
      {/* Expand/Collapse chevron - only shown if collapsible */}
      {isCollapsible && (
        <Box style={{ flexShrink: 0 }}>
          <ChevronIcon size={16} className="postybirb__edit_card_chevron" />
        </Box>
      )}

      {/* Title */}
      <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
        {submission.title || <Trans>Untitled</Trans>}
      </Text>

      {/* Archived badge */}
      {submission.isArchived && (
        <Badge color="grape" size="sm" variant="light">
          <Trans>Archived</Trans>
        </Badge>
      )}
    </Group>
  );
}
