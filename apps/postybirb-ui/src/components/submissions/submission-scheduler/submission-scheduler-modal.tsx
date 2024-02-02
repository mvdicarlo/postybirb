import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import { useState } from 'react';
import { Trans } from '@lingui/macro';
import submissionApi from '../../../api/submission.api';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import ErrorAlert from '../../shared/error-alert/error-alert';
import SubmissionScheduler from './submission-scheduler';

type SubmissionSchedulerModalProps = {
  submission: SubmissionDto;
  onClose: () => void;
};

function isUndefinedOrEmpty(value: string | undefined) {
  return value === undefined || value === '' || value === null;
}

function isBeforeToday(value: Date | string | undefined) {
  if (value === undefined) {
    return false;
  }
  const date = new Date(value);
  const today = new Date();
  return date < today;
}

function isValid(schedule: ISubmissionScheduleInfo) {
  if (schedule.scheduleType === ScheduleType.NONE) {
    return true;
  }
  if (schedule.scheduleType === ScheduleType.SINGLE) {
    return (
      !isUndefinedOrEmpty(schedule.scheduledFor) &&
      !isBeforeToday(schedule.scheduledFor)
    );
  }
  if (schedule.scheduleType === ScheduleType.RECURRING) {
    return (
      !isUndefinedOrEmpty(schedule.cron) &&
      !isUndefinedOrEmpty(schedule.scheduledFor)
    );
  }
  return false;
}

export default function SubmissionSchedulerModal(
  props: SubmissionSchedulerModalProps
) {
  const { submission, onClose } = props;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [updateSchedule, setUpdateSchedule] = useState(submission.schedule);
  const [responseError, setResponseError] = useState<string>();

  const hasChanges =
    JSON.stringify(submission.schedule) !== JSON.stringify(updateSchedule);
  const valid = isValid(updateSchedule);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <Trans context="schedule.submission">Schedule Submission</Trans>
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
          <Trans context="cancel">Cancel</Trans>
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          fill
          disabled={!hasChanges || !valid}
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
          <Trans context="update">Update</Trans>
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
