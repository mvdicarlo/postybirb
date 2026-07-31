import { Trans, useLingui } from '@lingui/react/macro';
import { Alert, Button, Group, Modal, Radio, Stack, Text } from '@mantine/core';
import { NodeStatus, PostRecordResumeMode } from '@postybirb/types';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { availablePostModes } from './available-post-modes';

interface PostModeModalProps {
  opened: boolean;
  newestStatus?: NodeStatus;
  onClose: () => void;
  onConfirm: (resumeMode: PostRecordResumeMode) => void;
  hasNewFiles?: boolean;
}

export function PostModeModal({
  opened,
  newestStatus,
  onClose,
  onConfirm,
  hasNewFiles,
}: PostModeModalProps) {
  const { t } = useLingui();
  const [selectedMode, setSelectedMode] = useState<PostRecordResumeMode>(
    PostRecordResumeMode.CONTINUE,
  );
  const modes = availablePostModes(newestStatus);
  const incomplete =
    newestStatus === NodeStatus.FAILED || newestStatus === NodeStatus.CANCELLED;

  useEffect(() => {
    if (opened) setSelectedMode(PostRecordResumeMode.CONTINUE);
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        incomplete ? <Trans>Resume Posting</Trans> : <Trans>Post Again</Trans>
      }
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {incomplete ? (
            <Trans>
              The last posting attempt did not finish. Choose how to continue.
            </Trans>
          ) : (
            <Trans>
              This submission has posting history. Continue incrementally or
              start a fresh post.
            </Trans>
          )}
        </Text>

        {incomplete && hasNewFiles ? (
          <Alert
            color="yellow"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            title={<Trans>Files were added since that attempt</Trans>}
          >
            <Trans>
              Websites that already finished will receive the new files as a
              separate post.
            </Trans>
          </Alert>
        ) : null}

        <Radio.Group
          value={selectedMode}
          onChange={(value) => setSelectedMode(value as PostRecordResumeMode)}
        >
          <Stack gap="md">
            {modes.includes(PostRecordResumeMode.CONTINUE) ? (
              <Radio
                value={PostRecordResumeMode.CONTINUE}
                label={t`Continue incrementally`}
                description={t`Keep successful deliveries and post only work that has not been delivered.`}
              />
            ) : null}

            {modes.includes(PostRecordResumeMode.CONTINUE_RETRY) ? (
              <Radio
                value={PostRecordResumeMode.CONTINUE_RETRY}
                label={t`Retry incomplete websites from the beginning`}
                description={t`Re-upload all current files to websites whose latest checkpoint is incomplete.`}
              />
            ) : null}

            {modes.includes(PostRecordResumeMode.NEW) ? (
              <Radio
                value={PostRecordResumeMode.NEW}
                label={t`Start a fresh post`}
                description={t`Ignore prior delivery and post all current content again.`}
              />
            ) : null}
          </Stack>
        </Radio.Group>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={() => onConfirm(selectedMode)}>
            <Trans>Post</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
