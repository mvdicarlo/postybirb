import { EuiDatePicker } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { ScheduleType } from '@postybirb/types';
import SubmissionsApi from 'apps/ui/src/api/submission.api';
import moment, { Moment } from 'moment';
import { useCallback, useEffect, useState } from 'react';

type DefaultSubmissionScheduleFieldProps = {
  submission: ISubmissionDto;
};

function isValidScheduleTime(date?: Moment | undefined | null): boolean {
  if (!date) {
    return true;
  }

  return Date.now() <= date.toDate().getTime();
}

export function DefaultSubmissionScheduleField({
  submission,
}: DefaultSubmissionScheduleFieldProps): JSX.Element {
  const { id, schedule, isScheduled } = submission;

  const [scheduledFor, setScheduledFor] = useState<Moment | undefined | null>(
    schedule.scheduledFor ? moment(schedule.scheduledFor) : undefined
  );

  useEffect(() => {
    setScheduledFor(
      schedule.scheduledFor ? moment(schedule.scheduledFor) : undefined
    );
  }, [schedule.scheduledFor]);

  const setSubmissionSchedule = useCallback(
    (date: Moment | null) => {
      SubmissionsApi.update(id, {
        isScheduled,
        scheduleType: ScheduleType.SINGLE,
        scheduledFor: date ? date.toISOString() : null,
      });
    },
    [id, isScheduled]
  );

  return (
    <EuiDatePicker
      className="euiFormControlLayout--compressed"
      showTimeSelect
      isInvalid={!isValidScheduleTime(scheduledFor)}
      selected={scheduledFor}
      minDate={moment()}
      onClear={() => {
        setScheduledFor(undefined);
        setSubmissionSchedule(null);
      }}
      onChange={(date) => {
        setScheduledFor(date);
        setSubmissionSchedule(date);
      }}
    />
  );
}
