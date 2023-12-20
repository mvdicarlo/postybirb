import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import ErrorAlert from '../../shared/error-alert/error-alert';
import SubmissionScheduler from './submission-scheduler';

type SubmissionSchedulerModalProps = {
  submission: SubmissionDto;
  onClose: () => void;
};

export default function SubmissionSchedulerModal(
  props: SubmissionSchedulerModalProps
) {
  const { submission, onClose } = props;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [updateSchedule, setUpdateSchedule] = useState(submission.schedule);
  const [responseError, setResponseError] = useState<string>();

  const hasChanges =
    JSON.stringify(submission.schedule) !== JSON.stringify(updateSchedule);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="schedule.submission"
            defaultMessage="Schedule Submission"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <ErrorAlert error={responseError} />
        <SubmissionScheduler
          schedule={updateSchedule}
          onChange={(update) => {
            setUpdateSchedule(update);
          }}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage id="cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          fill
          disabled={!hasChanges}
          isLoading={isSaving}
          onClick={() => {
            setIsSaving(true);
            submissionApi
              .update(submission.id, {
                metadata: submission.metadata,
                ...updateSchedule,
                newOrUpdatedOptions: [],
                deletedWebsiteOptions: [],
                isScheduled: submission.isScheduled,
              })
              .then(() => {
                setIsSaving(false);
                onClose();
              })
              .catch(({ error }) => {
                setResponseError(JSON.stringify(error, null, 1));
              });
          }}
        >
          <FormattedMessage id="update" defaultMessage="Update" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
