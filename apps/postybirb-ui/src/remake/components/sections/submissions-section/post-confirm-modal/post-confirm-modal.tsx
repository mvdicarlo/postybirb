/**
 * PostConfirmModal - Modal for confirming and reordering submissions before posting.
 * Displays a reorderable list allowing users to set the queue order.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { Alert, Button, Group, Modal, Radio, Stack, Text } from '@mantine/core';
import { PostRecordResumeMode, PostRecordState } from '@postybirb/types';
import { IconAlertCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubmissionRecord } from '../../../../stores/records';
import { ReorderableSubmissionList } from '../../../shared/reorderable-submission-list';

export interface PostConfirmModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Handler when user confirms - receives the ordered submission IDs and optional resume mode */
  onConfirm: (orderedIds: string[], resumeMode?: PostRecordResumeMode) => void;
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
  const { t } = useLingui();

  // Filter to only valid submissions that can be posted
  const validSubmissions = selectedSubmissions.filter(
    (s) => s.hasWebsiteOptions && !s.hasErrors,
  );

  // Check if any submission has a failed last post
  const hasFailedPosts = useMemo(
    () =>
      validSubmissions.some((s) => {
        const lastPost = s.latestPost;
        return lastPost && lastPost.state === PostRecordState.FAILED;
      }),
    [validSubmissions],
  );

  // Track the ordered list (reset when modal opens with new submissions)
  const [orderedSubmissions, setOrderedSubmissions] = useState<
    SubmissionRecord[]
  >([]);

  // Track selected resume mode
  const [resumeMode, setResumeMode] = useState<PostRecordResumeMode>(
    PostRecordResumeMode.CONTINUE,
  );

  // Reset order when modal opens or submissions change
  useEffect(() => {
    if (opened) {
      setOrderedSubmissions(validSubmissions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleConfirm = useCallback(() => {
    const orderedIds = orderedSubmissions.map((s) => s.id);
    onConfirm(orderedIds, hasFailedPosts ? resumeMode : undefined);
    onClose();
  }, [orderedSubmissions, onConfirm, onClose, hasFailedPosts, resumeMode]);

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

        {/* Resume mode selector for failed posts */}
        {hasFailedPosts && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={<Trans>Failed Posts Detected</Trans>}
            color="orange"
          >
            <Stack gap="sm">
              <Text size="sm">
                <Trans>
                  Some submissions have failed posting attempts. Choose how to
                  handle them:
                </Trans>
              </Text>
              <Radio.Group
                value={resumeMode}
                onChange={(value) =>
                  setResumeMode(value as PostRecordResumeMode)
                }
              >
                <Stack gap="xs">
                  <Radio
                    value={PostRecordResumeMode.CONTINUE}
                    label={t`Continue from where it left off`}
                    description={t`Skip websites that posted successfully and only attempt failed or unattempted ones.`}
                  />
                  <Radio
                    value={PostRecordResumeMode.CONTINUE_RETRY}
                    label={t`Retry all failed or unattempted websites`}
                    description={t`Retry posting to all websites that failed or were not attempted. All files will be re-uploaded.`}
                  />
                  <Radio
                    value={PostRecordResumeMode.NEW}
                    label={t`Start completely fresh`}
                    description={t`Discard all progress from the previous attempt and start as if this were the first time posting.`}
                  />
                </Stack>
              </Radio.Group>
            </Stack>
          </Alert>
        )}

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
