/**
 * SaveToManyAction - Button to apply multi-submission changes to multiple submissions.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Tooltip } from '@mantine/core';
import { SubmissionId } from '@postybirb/types';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useState } from 'react';
import submissionApi from '../../../../../api/submission.api';
import {
  showSuccessNotification,
  showUpdateErrorNotification,
} from '../../../../../utils/notifications';
import { SubmissionPickerModal } from '../../../../shared/submission-picker';
import { useSubmissionEditCardContext } from '../context';

/**
 * Action button that opens a modal to apply the current multi-submission
 * settings to multiple target submissions.
 */
export function SaveToManyAction() {
  const { submission } = useSubmissionEditCardContext();
  const [modalOpened, setModalOpened] = useState(false);

  const handleConfirm = async (submissionIds: string[], merge: boolean) => {
    try {
      await submissionApi.applyToMultipleSubmissions({
        submissionToApply: submission.id as SubmissionId,
        submissionIds: submissionIds as SubmissionId[],
        merge,
      });
      showSuccessNotification(
        <Trans>Applied to {submissionIds.length} submission(s)</Trans>
      );
      setModalOpened(false);
    } catch {
      showUpdateErrorNotification();
    }
  };

  return (
    <>
      <Tooltip label={<Trans>Save to submissions</Trans>}>
        <ActionIcon
          variant="subtle"
          size="sm"
          color="blue"
          onClick={(e) => {
            e.stopPropagation();
            setModalOpened(true);
          }}
        >
          <IconDeviceFloppy size={16} />
        </ActionIcon>
      </Tooltip>

      <SubmissionPickerModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        onConfirm={handleConfirm}
        type={submission.type}
        excludeIds={[submission.id]}
        title={<Trans>Save to Submissions</Trans>}
      />
    </>
  );
}
