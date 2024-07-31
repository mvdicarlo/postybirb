import { Trans } from '@lingui/macro';
import { Anchor, Box, Flex, Radio, TextInput } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import { IconLink } from '@tabler/icons-react';
import { Cron } from 'croner';
import cronstrue from 'cronstrue';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from 'react-use';

const DEFAULT_CRON = '0 0 * * FRI';

const radios = [
  {
    id: ScheduleType.NONE,
    label: <Trans context="internalSchedule.none">None</Trans>,
  },
  {
    id: ScheduleType.SINGLE,
    label: <Trans context="internalSchedule.single">Once</Trans>,
  },
  {
    id: ScheduleType.RECURRING,
    label: <Trans context="internalSchedule.recurring">Recurring</Trans>,
  },
];

type SubmissionSchedulerProps = {
  schedule: ISubmissionScheduleInfo;
  onChange: (change: ISubmissionScheduleInfo) => void;
};

export const ScheduleGlobalKey = 'last-used-schedule';

export default function SubmissionScheduler(props: SubmissionSchedulerProps) {
  const { schedule, onChange } = props;
  // For recall of recently set time within this specific component
  const [lastKnownSetDate, setLastKnownSetDate] = useState(
    schedule.scheduledFor
  );
  const [internalSchedule, setInternalSchedule] =
    useState<ISubmissionScheduleInfo>(schedule);
  // For recall of recently set submissions
  const [lastUsedSchedule, setLastUsedSchedule] = useLocalStorage<
    Date | undefined
  >(ScheduleGlobalKey, new Date(), {
    raw: false,
    deserializer: (value) => new Date(value),
    serializer: (value) => value?.toISOString() ?? new Date().toISOString(),
  });
  const onUpdate = useCallback(
    (newSchedule: ISubmissionScheduleInfo) => {
      setInternalSchedule(newSchedule);
      onChange(newSchedule);
    },
    [onChange, setInternalSchedule]
  );

  const datePicker = useMemo(() => {
    switch (internalSchedule.scheduleType) {
      case ScheduleType.NONE:
        return null;
      case ScheduleType.RECURRING:
        // eslint-disable-next-line no-case-declarations
        let cronHelp: JSX.Element | null = <Trans>Invalid CRON string</Trans>;
        try {
          cronHelp = internalSchedule.cron ? (
            <span>
              {cronstrue.toString(internalSchedule.cron)} (
              {moment(internalSchedule.scheduledFor).format('lll')})
            </span>
          ) : null;
        } catch (e) {
          // Do nothing
        }
        return (
          <TextInput
            label={
              <Anchor href="https://crontab.cronhub.io/" c="blue">
                <Trans>CRON Format</Trans>{' '}
                <IconLink size="1em" style={{ verticalAlign: 'middle' }} />
              </Anchor>
            }
            description={cronHelp}
            value={internalSchedule.cron}
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
        );
      case ScheduleType.SINGLE:
      default: {
        const date = new Date(internalSchedule.scheduledFor as string);
        return (
          <DateTimePicker
            clearable
            // eslint-disable-next-line lingui/no-unlocalized-strings
            valueFormat="YYYY-MM-DD HH:mm A"
            highlightToday
            minDate={new Date()}
            value={date}
            submitButtonProps={{ display: 'none' }}
            onChange={(newDate) => {
              const dateStr = newDate?.toISOString();
              onUpdate({ ...schedule, scheduledFor: dateStr });
              setLastUsedSchedule(newDate ?? new Date());
              setLastKnownSetDate(dateStr);
            }}
          />
        );
      }
    }
  }, [
    internalSchedule.cron,
    internalSchedule.scheduleType,
    internalSchedule.scheduledFor,
    onUpdate,
    schedule,
    setLastUsedSchedule,
  ]);

  return (
    <Box className="postybirb__submission-scheduler">
      <Flex>
        <Radio.Group
          defaultValue={internalSchedule.scheduleType}
          onChange={(id) => {
            const type = id as ScheduleType;
            switch (type) {
              case ScheduleType.SINGLE: {
                let date: string | undefined;
                if (lastUsedSchedule) {
                  const lastUsedDate = new Date(lastUsedSchedule).getTime();
                  const now = Date.now();
                  if (now < lastUsedDate) {
                    date = lastUsedSchedule.toISOString();
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
        >
          {radios.map((radio) => (
            <Radio mb="4" key={radio.id} value={radio.id} label={radio.label} />
          ))}
        </Radio.Group>
        <div className="ml-3 flex-1">{datePicker}</div>
      </Flex>
    </Box>
  );
}
