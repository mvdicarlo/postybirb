/**
 * SubmissionPickerModal - Modal wrapper for selecting submissions with merge mode options.
 */

import { Trans } from '@lingui/react/macro';
import { Button, Group, Modal, Radio, Stack, Text } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { useState, useEffect } from 'react';
import { SubmissionPicker } from './submission-picker';

export interface SubmissionPickerModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when user confirms selection */
  onConfirm: (submissionIds: string[], merge: boolean) => void;
  /** Filter submissions by type */
  type: SubmissionType;
  /** Submission IDs to exclude from the picker */
  excludeIds?: string[];
  /** Initial IDs to pre-select when the modal opens */
  initialSelectedIds?: string[];
  /** Modal title */
  title?: React.ReactNode;
}

/**
 * Modal for selecting multiple submissions with merge mode options.
 */
export function SubmissionPickerModal({
  opened,
  onClose,
  onConfirm,
  type,
  excludeIds = [],
  initialSelectedIds = [],
  title,
}: SubmissionPickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace'>('merge');

  // Sync initial selection when modal opens
  useEffect(() => {
    if (opened) {
      setSelectedIds(initialSelectedIds);
    }
  }, [opened, initialSelectedIds]);

  const handleConfirm = () => {
    onConfirm(selectedIds, mergeMode === 'merge');
    // Reset state after confirm
    setSelectedIds([]);
    setMergeMode('merge');
  };

  const handleClose = () => {
    // Reset state on close
    setSelectedIds([]);
    setMergeMode('merge');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title ?? <Trans>Apply</Trans>}
      size="lg"
      centered
    >
      <Stack gap="md">
        <SubmissionPicker
          value={selectedIds}
          onChange={setSelectedIds}
          type={type}
          excludeIds={excludeIds}
        />

        <Radio.Group
          value={mergeMode}
          onChange={(value) => setMergeMode(value as 'merge' | 'replace')}
          label={<Trans>Merge Mode</Trans>}
        >
          <Stack gap="xs" mt="xs">
            <Radio
              value="merge"
              label={
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    <Trans>Merge (recommended)</Trans>
                  </Text>
                  <Text size="xs" c="dimmed">
                    <Trans>
                      Overwrite overlapping website options only. Keeps existing
                      website options that are not specified in the source.
                    </Trans>
                  </Text>
                </Stack>
              }
            />
            <Radio
              value="replace"
              label={
                <Stack gap={2}>
                  <Text size="sm" fw={500}>
                    <Trans>Replace All</Trans>
                  </Text>
                  <Text size="xs" c="dimmed">
                    <Trans>
                      Delete all existing website options and use only those
                      specified in the source.
                    </Trans>
                  </Text>
                </Stack>
              }
            />
          </Stack>
        </Radio.Group>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
            <Trans>Apply</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
