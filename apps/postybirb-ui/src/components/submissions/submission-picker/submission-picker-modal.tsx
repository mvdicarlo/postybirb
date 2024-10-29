import { Trans } from '@lingui/macro';
import { Button, Group, Modal, Stack, Title } from '@mantine/core';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { PropsWithChildren, useState } from 'react';
import { SubmissionPicker } from './submission-picker';

type SubmissionPickerModalProps = {
  type: SubmissionType;
  onClose: () => void;
  onApply: (submissions: SubmissionId[]) => void;
};

export function SubmissionPickerModal(
  props: PropsWithChildren<SubmissionPickerModalProps>
) {
  const { children, type, onClose, onApply } = props;
  const [selectedSubmissions, setSelectedSubmissions] = useState<
    SubmissionId[]
  >([]);
  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Title order={4}>
          <Trans>Choose Submissions</Trans>
        </Title>
      }
    >
      <Stack gap="xs">
        <SubmissionPicker
          type={type}
          value={selectedSubmissions}
          onChange={setSelectedSubmissions}
        />
        {children}
        <Group justify="end">
          <Button
            variant="subtle"
            c="var(--mantine-color-text)"
            onClick={onClose}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={selectedSubmissions.length === 0}
            onClick={() => {
              onApply(selectedSubmissions);
            }}
          >
            <Trans>Apply</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
