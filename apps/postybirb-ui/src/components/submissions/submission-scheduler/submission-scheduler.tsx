import {
  EuiDatePicker,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiRadioGroup,
} from '@elastic/eui';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import cronstrue from 'cronstrue';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import { Trans } from '@lingui/macro';
import { useLocalStorage } from 'react-use';

const radios = [
  {
    id: ScheduleType.NONE,
    label: <Trans id="schedule.none">None</Trans>,
  },
  {
    id: ScheduleType.SINGLE,
    label: <Trans id="schedule.single">Once</Trans>,
  },
  {
    id: ScheduleType.RECURRING,
    label: <Trans id="schedule.recurring">Recurring</Trans>,
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
        return (
          <EuiFormRow
            label={
              <EuiLink href="https://crontab.cronhub.io/">
                Cron Format <EuiIcon type="link" size="s" />
              </EuiLink>
            }
            helpText={
              schedule.scheduledFor
                ? cronstrue.toString(schedule.scheduledFor)
                : 'Invalid CRON string'
            }
          >
            <EuiFieldText
              value={schedule.scheduledFor}
              onChange={(event) => {
                onUpdate({
                  ...schedule,
                  scheduledFor: event.target.value,
                });
              }}
            />
          </EuiFormRow>
        );
      case ScheduleType.SINGLE:
      default: {
        const date = new Date(schedule.scheduledFor as string);
        const momentDate = !Number.isNaN(date.getTime())
          ? moment(date)
          : undefined;
        const now = moment();
        return (
          <EuiDatePicker
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
      <div className="flex">
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
              case ScheduleType.RECURRING:
                onUpdate({
                  scheduleType: id as ScheduleType,
                  scheduledFor: '0 0 * * FRI',
                });
                break;
              case ScheduleType.NONE:
              default:
                onUpdate({
                  scheduleType: id as ScheduleType,
                  scheduledFor: undefined,
                });
                break;
            }
          }}
        />
        <div className="ml-3 flex-1">{datePicker}</div>
      </div>
    </div>
  );
}
