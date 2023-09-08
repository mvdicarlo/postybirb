import { EuiDatePicker, EuiRadioGroup, EuiSpacer } from '@elastic/eui';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocalStorage } from 'react-use';

const radios = [
  {
    id: ScheduleType.NONE,
    label: <FormattedMessage id="schedule.none" defaultMessage="None" />,
  },
  {
    id: ScheduleType.SINGLE,
    label: <FormattedMessage id="schedule.single" defaultMessage="Once" />,
  },
  {
    id: ScheduleType.RECURRING,
    label: (
      <FormattedMessage id="schedule.recurring" defaultMessage="Recurring" />
    ),
  },
];

type SubmissionSchedulerProps = {
  schedule: ISubmissionScheduleInfo;
  onChange: (change: ISubmissionScheduleInfo) => void;
};

const key = 'last-used-schedule';

export default function SubmissionScheduler(props: SubmissionSchedulerProps) {
  const { schedule, onChange } = props;
  // For recall of recently set time within this specific component
  const [lastKnownSetDate, setLastKnownSetDate] = useState(
    schedule.scheduledFor
  );
  // For recall of recently set submissions
  const [lastUsedSchedule, setLastUsedSchedule] = useLocalStorage<
    string | undefined
  >(key);
  const onUpdate = useCallback(
    (newSchedule: ISubmissionScheduleInfo) => {
      onChange(newSchedule);
    },
    [onChange]
  );

  const datePicker = useMemo(() => {
    switch (schedule.scheduleType) {
      case ScheduleType.NONE:
        return null;
      case ScheduleType.RECURRING:
        return <div>Recurring</div>;
      case ScheduleType.SINGLE:
      default: {
        const date = new Date(schedule.scheduledFor as string);
        const momentDate = !Number.isNaN(date.getTime())
          ? moment(date)
          : undefined;
        const now = moment();
        return (
          <EuiDatePicker
            inline
            showTimeSelect
            minDate={now}
            shadow={false}
            selected={momentDate}
            onChange={(newDate) => {
              const dateStr = newDate?.toString();
              onUpdate({ ...schedule, scheduledFor: dateStr });
              setLastUsedSchedule(dateStr);
              setLastKnownSetDate(dateStr);
            }}
          />
        );
      }
    }
  }, [onUpdate, schedule, setLastUsedSchedule]);

  return (
    <div className="postybirb__submission-scheduler">
      <EuiRadioGroup
        options={radios}
        idSelected={schedule.scheduleType}
        onChange={(id) => {
          switch (id as ScheduleType) {
            case ScheduleType.SINGLE: {
              let date: string | undefined;
              if (lastUsedSchedule) {
                const lastUsedDate = new Date(lastUsedSchedule).getTime();
                const now = Date.now();
                if (now < lastUsedDate) {
                  date = lastUsedSchedule;
                }
              }
              onUpdate({
                scheduleType: id as ScheduleType,
                scheduledFor: lastKnownSetDate ?? date,
              });
              break;
            }
            case ScheduleType.NONE:
            case ScheduleType.RECURRING:
            default:
              onUpdate({
                scheduleType: id as ScheduleType,
                scheduledFor: undefined,
              });
              break;
          }
        }}
      />
      <EuiSpacer size="xs" />
      {datePicker}
    </div>
  );
}
