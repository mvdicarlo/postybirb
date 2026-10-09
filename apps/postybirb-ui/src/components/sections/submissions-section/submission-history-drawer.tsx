/**
 * SubmissionHistoryDrawer - Thin drawer wrapper around PostHistoryContent.
 * Used for list-level history triggers (submissions-section, archived list).
 */

import { Drawer, Group, ScrollArea, Text } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import type { SubmissionRecord } from '../../../stores/records';
import { PostHistoryContent } from './submission-history';

interface SubmissionHistoryDrawerProps {
  /** Whether the drawer is open */
  opened: boolean;
  /** Handler to close the drawer */
  onClose: () => void;
  /** The submission to display history for */
  submission: SubmissionRecord | null;
}

/**
 * Drawer component for viewing submission post history.
 */
export function SubmissionHistoryDrawer({
  opened,
  onClose,
  submission,
}: SubmissionHistoryDrawerProps) {
  if (!submission) {
    return null;
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconHistory size={20} />
          <Text fw={500}>{submission.title}</Text>
        </Group>
      }
      position="right"
      size="lg"
      padding="md"
    >
      {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
      <ScrollArea h="calc(100vh - 80px)">
        <PostHistoryContent submission={submission} />
      </ScrollArea>
    </Drawer>
  );
}
