import {
  EuiDatePicker,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiRadioGroup,
} from '@elastic/eui';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import { Cron } from 'croner';
import cronstrue from 'cronstrue';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocalStorage } from 'react-use';

const DEFAULT_CRON = '0 0 * * FRI';

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
        // eslint-disable-next-line no-case-declarations
        let cronHelp: JSX.Element | null = (
          <FormattedMessage
            id="schedule.cron.invalid"
            defaultMessage="Invalid CRON string"
          />
        );
        try {
          cronHelp = schedule.cron ? (
            <span>
              {cronstrue.toString(schedule.cron)} (
              {moment(schedule.scheduledFor).format('lll')})
            </span>
          ) : null;
        } catch (e) {
          // Do nothing
        }
        return (
          <EuiFormRow
            label={
              <EuiLink href="https://crontab.cronhub.io/">
                CRON Format <EuiIcon type="link" size="s" />
              </EuiLink>
            }
            helpText={cronHelp}
          >
            <EuiFieldText
              value={schedule.cron}
              onChange={(event) => {
                let scheduledFor;
                try {
                  scheduledFor = Cron(event.target.value)
                    ?.nextRun()
                    ?.toISOString();
                } catch (e) {
                  // Do nothing
                }
                onUpdate({
                  ...schedule,
                  cron: event.target.value,
                  scheduledFor,
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
              const dateStr = newDate?.toISOString();
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
            const type = id as ScheduleType;
            switch (type) {
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
                  scheduleType: type,
                  scheduledFor:
                    lastKnownSetDate ??
                    date ??
                    moment().add(1, 'day').toISOString(),
                  cron: undefined,
                });
                break;
              }
              case ScheduleType.RECURRING:
                onUpdate({
                  scheduleType: type,
                  cron: DEFAULT_CRON,
                  scheduledFor: Cron(DEFAULT_CRON)?.nextRun()?.toISOString(),
                });
                break;
              case ScheduleType.NONE:
              default:
                onUpdate({
                  scheduleType: type,
                  scheduledFor: undefined,
                  cron: undefined,
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
