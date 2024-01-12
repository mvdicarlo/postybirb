import { EuiButtonIcon, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { ScheduleType } from '@postybirb/types';
import cronstrue from 'cronstrue';
import moment from 'moment';
import { useState } from 'react';
import { SubmissionDto } from '../../../../../../models/dtos/submission.dto';
import SubmissionSchedulerModal from '../../../../submission-scheduler/submission-scheduler-modal';

type DefaultSubmissionScheduleFieldProps = {
  submission: SubmissionDto;
};

export function DefaultSubmissionScheduleField({
  submission,
}: DefaultSubmissionScheduleFieldProps): JSX.Element {
  const { schedule } = submission;
  const [isModalVisible, setModalVisible] = useState(false);

  let scheduleText = '';
  if (schedule.scheduledFor) {
    if (schedule.scheduleType === ScheduleType.RECURRING) {
      scheduleText = schedule.scheduledFor;
    } else {
      scheduleText = moment(schedule.scheduledFor).format('lll');
    }
  }

  return (
    <>
      {isModalVisible ? (
        <SubmissionSchedulerModal
          submission={submission}
          onClose={() => {
            setModalVisible(false);
          }}
        />
      ) : null}
      <EuiFormRow
        helpText={
          schedule.scheduledFor &&
          schedule.scheduleType === ScheduleType.RECURRING
            ? cronstrue.toString(schedule.scheduledFor)
            : null
        }
        onClickCapture={() => {
          setModalVisible(true);
        }}
      >
        <EuiFieldText
          compressed
          prepend={<EuiButtonIcon iconType="calendar" aria-label="Schedule" />}
          placeholder="No schedule"
          readOnly
          value={scheduleText}
        />
      </EuiFormRow>
    </>
  );
}
