/**
 * ResumeModeModal - Modal for selecting how to resume a failed posting attempt.
 * Displays user-friendly descriptions for each resume mode option.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { Button, Group, Modal, Radio, Stack, Text } from '@mantine/core';
import { PostRecordResumeMode } from '@postybirb/types';
import { useState } from 'react';

interface ResumeModeModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Called when the modal should close without posting */
  onClose: () => void;
  /** Called when the user selects a resume mode and confirms */
  onConfirm: (resumeMode: PostRecordResumeMode) => void;
}

/**
 * Modal that allows the user to select how to handle a failed posting attempt.
 * Shows three options with clear descriptions:
 * - CONTINUE: Resume from where it left off
 * - CONTINUE_RETRY: Retry failed websites but keep successful ones
 * - NEW: Start completely fresh
 */
export function ResumeModeModal({
  opened,
  onClose,
  onConfirm,
}: ResumeModeModalProps) {
  const { t } = useLingui();
  const [selectedMode, setSelectedMode] = useState<PostRecordResumeMode>(
    PostRecordResumeMode.CONTINUE,
  );

  const handleConfirm = () => {
    onConfirm(selectedMode);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Trans>Resume Failed Posting</Trans>}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          <Trans>
            The last posting attempt failed. How would you like to proceed?
          </Trans>
        </Text>

        <Radio.Group
          value={selectedMode}
          onChange={(value) => setSelectedMode(value as PostRecordResumeMode)}
        >
          <Stack gap="md">
            <Radio
              value={PostRecordResumeMode.CONTINUE}
              label={t`Continue from where it left off`}
              description={t`Skip websites that posted successfully and only attempt failed or unattempted ones. Continues from the last successful batch of files.`}
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

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleConfirm}>
            <Trans>Post</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
