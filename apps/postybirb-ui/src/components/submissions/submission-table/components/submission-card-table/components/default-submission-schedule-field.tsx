import { EuiButtonIcon, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
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
      scheduleText = `${schedule.cron}`;
    } else {
      scheduleText = moment(schedule.scheduledFor).format('lll');
    }
  }

  const { _ } = useLingui();

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
        fullWidth
        helpText={
          schedule.cron && schedule.scheduleType === ScheduleType.RECURRING
            ? `${cronstrue.toString(schedule.cron)} (${moment(
                schedule.scheduledFor
              ).format('lll')})`
            : null
        }
        onClickCapture={() => {
          setModalVisible(true);
        }}
      >
        <EuiFieldText
          compressed
          fullWidth
          prepend={
            <EuiButtonIcon iconType="calendar" aria-label={_(msg`Schedule`)} />
          }
          placeholder={_(msg`No schedule`)}
          readOnly
          value={scheduleText}
        />
      </EuiFormRow>
    </>
  );
}
