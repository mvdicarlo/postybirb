import { EuiDatePicker } from '@elastic/eui';
import moment, { Moment } from 'moment';
import { useEffect, useState } from 'react';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';

type DefaultSubmissionScheduleFieldProps = {
  submission: SubmissionDto;
};

export function DefaultSubmissionScheduleField({
  submission,
}: DefaultSubmissionScheduleFieldProps): JSX.Element {
  const { schedule } = submission;

  const [scheduledFor, setScheduledFor] = useState<Moment | undefined | null>(
    schedule.scheduledFor ? moment(schedule.scheduledFor) : undefined
  );

  useEffect(() => {
    setScheduledFor(
      schedule.scheduledFor ? moment(schedule.scheduledFor) : undefined
    );
  }, [schedule.scheduledFor]);

  return (
    <EuiDatePicker
      className="euiFormControlLayout--compressed"
      showTimeSelect
      isInvalid={!submission.hasValidScheduleTime()}
      selected={scheduledFor}
      minDate={moment()}
      onClear={() => {
        setScheduledFor(undefined);
        submission.updateSchedule(null);
      }}
      onChange={(date) => {
        setScheduledFor(date);
        submission.updateSchedule(date);
      }}
    />
  );
}
