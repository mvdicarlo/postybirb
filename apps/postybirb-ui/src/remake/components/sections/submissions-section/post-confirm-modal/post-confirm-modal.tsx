/**
 * PostConfirmModal - Modal for confirming and reordering submissions before posting.
 * Displays a reorderable list allowing users to set the queue order.
 */

import { Trans } from '@lingui/react/macro';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import type { SubmissionRecord } from '../../../../stores/records';
import { ReorderableSubmissionList } from '../../../shared/reorderable-submission-list';

export interface PostConfirmModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler when user confirms - receives the ordered submission IDs */
  onConfirm: (orderedIds: string[]) => void;
  /** All selected submissions (will be filtered to only valid ones) */
  selectedSubmissions: SubmissionRecord[];
  /** Total number of selected submissions (including invalid) */
  totalSelectedCount: number;
  /** Whether the confirm action is loading */
  loading?: boolean;
}

/**
 * Modal for confirming submission posting with reorderable queue.
 * Shows only valid submissions (with website options and no errors).
 */
export function PostConfirmModal({
  opened,
  onClose,
  onConfirm,
  selectedSubmissions,
  totalSelectedCount,
  loading = false,
}: PostConfirmModalProps) {
  // Filter to only valid submissions that can be posted
  const validSubmissions = selectedSubmissions.filter(
    (s) => s.hasWebsiteOptions && !s.hasErrors
  );

  // Track the ordered list (reset when modal opens with new submissions)
  const [orderedSubmissions, setOrderedSubmissions] = useState<
    SubmissionRecord[]
  >([]);

  // Reset order when modal opens or submissions change
  useEffect(() => {
    if (opened) {
      setOrderedSubmissions(validSubmissions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleConfirm = useCallback(() => {
    const orderedIds = orderedSubmissions.map((s) => s.id);
    onConfirm(orderedIds);
    onClose();
  }, [orderedSubmissions, onConfirm, onClose]);

  const validCount = validSubmissions.length;
  const hasSkippedSubmissions = validCount < totalSelectedCount;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Trans>Post Submissions</Trans>}
      centered
      radius="md"
      size="md"
    >
      <Stack>
        {/* Info message */}
        <Text size="sm">
          {hasSkippedSubmissions ? (
            <Trans>
              {validCount} of {totalSelectedCount} selected submission(s) are
              ready to post. Submissions without websites or with validation
              errors will be skipped.
            </Trans>
          ) : (
            <Trans>
              {validCount} submission(s) will be posted in the order shown
              below.
            </Trans>
          )}
        </Text>

        {/* Reorderable list */}
        {validCount > 0 && (
          <ReorderableSubmissionList
            submissions={orderedSubmissions}
            onReorder={setOrderedSubmissions}
            maxHeight="300px"
          />
        )}

        {/* Action buttons */}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            color="blue"
            onClick={handleConfirm}
            loading={loading}
            disabled={validCount === 0}
          >
            <Trans>Post</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
