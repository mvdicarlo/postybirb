/**
 * PostConfirmModal - Modal for confirming and reordering submissions before posting.
 * Displays a reorderable list allowing users to set the queue order, and surfaces
 * each submission's cross-submission dependencies (the submissions it waits for).
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Pill,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import type { PostRecordResumeMode, SubmissionId } from '@postybirb/types';
import { IconClock, IconInfoCircle } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccountsMap } from '../../../../stores/entity/account-store';
import { useSubmissionsMap } from '../../../../stores/entity/submission-store';
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
  const accountsMap = useAccountsMap();
  const submissionsMap = useSubmissionsMap();

  // Filter to only valid submissions that can be posted
  const validSubmissions = selectedSubmissions.filter(
    (s) => s.hasWebsiteOptions && !s.hasErrors,
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

  // Ids being posted in this batch, so a dependency can be flagged as either
  // "also in this batch" or external (still gates, just not selected here).
  const batchIds = useMemo(
    () => new Set(orderedSubmissions.map((s) => s.id)),
    [orderedSubmissions],
  );

  const anyHasDependencies = useMemo(
    () => orderedSubmissions.some((s) => (s.metadata?.dependsOn?.length ?? 0) > 0),
    [orderedSubmissions],
  );

  // Build the "waits for" dependency chips for a submission (if any).
  const getDependencyChips = useCallback(
    (submission: SubmissionRecord) => {
      const dependsOn = submission.metadata?.dependsOn ?? [];
      if (dependsOn.length === 0) return null;

      return (
        <Group gap={6} mt={4} align="center" wrap="wrap">
          <Text
            size="xs"
            c="dimmed"
            fw={500}
            span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <IconClock size={12} />
            <Trans>Waits for</Trans>
          </Text>
          {dependsOn.map((dependencyId: SubmissionId) => {
            const dependency = submissionsMap.get(dependencyId);
            const inBatch = batchIds.has(dependencyId);
            const label = dependency
              ? dependency.title.trim() || t`Untitled`
              : t`Deleted submission`;
            let tooltip: string;
            let color: string;
            if (!dependency) {
              tooltip = t`This dependency no longer exists and will be ignored.`;
              color = 'red';
            } else if (inBatch) {
              tooltip = t`Also being posted in this batch.`;
              color = 'grape';
            } else {
              tooltip = t`Not selected here — this submission still waits for it to finish posting.`;
              color = 'gray';
            }
            return (
              <Tooltip
                key={dependencyId}
                label={tooltip}
                multiline
                w={220}
                withArrow
              >
                <Badge
                  size="sm"
                  variant="light"
                  color={color}
                  radius="sm"
                  style={{
                    maxWidth: 180,
                    textTransform: 'none',
                    cursor: 'default',
                  }}
                >
                  {label}
                </Badge>
              </Tooltip>
            );
          })}
        </Group>
      );
    },
    [submissionsMap, batchIds, t],
  );

  const renderExtra = useCallback(
    (submission: SubmissionRecord) => {
      const nonDefaultOptions = submission.options.filter((o) => !o.isDefault);
      const dependencies = getDependencyChips(submission);
      if (nonDefaultOptions.length === 0 && !dependencies) return null;

      return (
        <Stack gap={2} mt={4}>
          {nonDefaultOptions.length > 0 && (
            <Pill.Group gap={4}>
              {nonDefaultOptions.map((option) => {
                const acc = accountsMap.get(option.accountId);
                return (
                  <Pill
                    key={option.accountId}
                    style={{ maxWidth: 'unset', flex: 'none' }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Badge
                        size="xs"
                        variant="light"
                        radius="sm"
                        px={4}
                        style={{ flexShrink: 0 }}
                      >
                        {acc?.websiteDisplayName ?? option.account?.website}
                      </Badge>
                      <Text size="xs" span>
                        {acc?.name ?? option.account?.name ?? option.accountId}
                      </Text>
                    </span>
                  </Pill>
                );
              })}
            </Pill.Group>
          )}
          {dependencies}
        </Stack>
      );
    },
    [accountsMap, getDependencyChips],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(orderedSubmissions.map((s) => s.id));
    onClose();
  }, [orderedSubmissions, onConfirm, onClose]);

  const validCount = validSubmissions.length;
  const hasSkippedSubmissions = validCount < totalSelectedCount;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs" align="center">
          <Text fw={600}>
            <Trans>Post Submissions</Trans>
          </Text>
          {validCount > 0 && (
            <Badge variant="light" color="blue" radius="sm">
              {validCount}
            </Badge>
          )}
        </Group>
      }
      centered
      radius="md"
      size="md"
    >
      <Stack>
        {/* Info message */}
        <Text size="sm" c="dimmed">
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

        {/* Dependency explainer (only when a submission has dependencies) */}
        {anyHasDependencies && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
            p="xs"
            radius="md"
          >
            <Text size="xs">
              <Trans>
                Some submissions wait for others to finish posting first. These
                dependencies are enforced automatically, regardless of the order
                below.
              </Trans>
            </Text>
          </Alert>
        )}

        {/* Reorderable list */}
        {validCount > 0 && (
          <ReorderableSubmissionList
            submissions={orderedSubmissions}
            onReorder={setOrderedSubmissions}
            renderExtra={renderExtra}
            maxHeight="320px"
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
