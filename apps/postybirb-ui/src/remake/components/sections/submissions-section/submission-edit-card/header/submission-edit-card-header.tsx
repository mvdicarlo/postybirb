/**
 * SubmissionEditCardHeader - Header components for the submission edit card.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Group, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useSubmissionEditCardContext } from '../context';

/**
 * Header component for the submission edit card (expanded state).
 */
export function SubmissionEditCardHeader() {
  const { submission, isCollapsible } = useSubmissionEditCardContext();

  return (
    <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
      {/* Expand/Collapse chevron - only shown if collapsible */}
      {isCollapsible && (
        <Box style={{ flexShrink: 0 }}>
          <IconChevronDown size={16} className="postybirb__edit_card_chevron" />
        </Box>
      )}

      {/* Title */}
      <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
        {submission.title || <Trans>Untitled</Trans>}
      </Text>
    </Group>
  );
}

/**
 * Collapsed header - shown when card is collapsed.
 */
export function SubmissionEditCardCollapsedHeader() {
  const { submission, isCollapsible } = useSubmissionEditCardContext();

  return (
    <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
      {/* Expand/Collapse chevron */}
      {isCollapsible && (
        <Box style={{ flexShrink: 0 }}>
          <IconChevronRight
            size={16}
            className="postybirb__edit_card_chevron"
          />
        </Box>
      )}

      {/* Title */}
      <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
        {submission.title || <Trans>Untitled</Trans>}
      </Text>
    </Group>
  );
}
