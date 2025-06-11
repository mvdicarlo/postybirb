import { Trans } from '@lingui/macro';
import {
  Accordion,
  Anchor,
  Badge,
  Box,
  Group,
  Paper,
  Radio,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { ISubmissionScheduleInfo, ScheduleType } from '@postybirb/types';
import {
  IconCalendar,
  IconClockHour4,
  IconCode,
  IconLink,
  IconRepeat,
  IconX,
} from '@tabler/icons-react';
import { Cron } from 'croner';
import cronstrue from 'cronstrue';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'react-use';
import { CronBuilder } from './cron-builder';

const DEFAULT_CRON = '0 0 * * FRI';

const radios = [
  {
    id: ScheduleType.NONE,
    label: <Trans>None</Trans>,
    icon: <IconX size={16} />,
    description: <Trans>No scheduling</Trans>,
  },
  {
    id: ScheduleType.SINGLE,
    label: <Trans>Once</Trans>,
    icon: <IconCalendar size={16} />,
    description: <Trans>Schedule for a specific date and time</Trans>,
  },
  {
    id: ScheduleType.RECURRING,
    label: <Trans>Recurring</Trans>,
    icon: <IconRepeat size={16} />,
    description: <Trans>Schedule to repeat regularly</Trans>,
  },
];

type SubmissionSchedulerProps = {
  schedule: ISubmissionScheduleInfo;
  onChange: (change: ISubmissionScheduleInfo) => void;
};

export const ScheduleGlobalKey = 'last-used-schedule';
export const SCHEDULE_ACCORDION_KEY = 'schedule-accordion-expanded';

export function SubmissionScheduler(props: SubmissionSchedulerProps) {
  const { schedule, onChange } = props;
  // For recall of recently set time within this specific component
  const [lastKnownSetDate, setLastKnownSetDate] = useState(
    schedule.scheduledFor,
  );
  const [internalSchedule, setInternalSchedule] =
    useState<ISubmissionScheduleInfo>(schedule);
  // For recall of recently set submissions
  const [lastUsedSchedule, setLastUsedSchedule] = useLocalStorage<
    Date | undefined
  >(ScheduleGlobalKey, new Date(), {
    raw: false,
    deserializer: (value) => {
      const date = value ? new Date(value) : new Date();
      if (date.toString() === 'Invalid Date') return new Date();
      return date;
    },
    serializer: (value) => value?.toISOString() ?? new Date().toISOString(),
  });
  const [cronInputMode, setCronInputMode] = useState<'builder' | 'manual'>(
    'builder',
  );
  const [isAccordionExpanded, setIsAccordionExpanded] =
    useLocalStorage<boolean>(
      SCHEDULE_ACCORDION_KEY,
      true, // Default to expanded
      {
        raw: false,
        deserializer: (value) => value === 'true',
        serializer: (value) => value.toString(),
      },
    );

  const onUpdate = useCallback(
    (newSchedule: ISubmissionScheduleInfo) => {
      setInternalSchedule(newSchedule);
      onChange(newSchedule);
    },
    [onChange, setInternalSchedule],
  );

  useEffect(() => {
    setInternalSchedule(schedule);
  }, [schedule]);

  const datePicker = useMemo(() => {
    switch (internalSchedule.scheduleType) {
      case ScheduleType.NONE:
        return null;
      case ScheduleType.RECURRING:
        // eslint-disable-next-line no-case-declarations
        let cronHelp: JSX.Element | null = <Trans>Invalid CRON string</Trans>;
        // eslint-disable-next-line no-case-declarations
        let isValidCron = false;
        try {
          if (internalSchedule.cron) {
            isValidCron = !!Cron(internalSchedule.cron);
            cronHelp = (
              <Stack gap="xs">
                <Text size="sm" color={isValidCron ? 'green' : 'red'}>
                  {isValidCron ? (
                    cronstrue.toString(internalSchedule.cron)
                  ) : (
                    <Trans>Invalid CRON format</Trans>
                  )}
                </Text>
                {isValidCron && internalSchedule.scheduledFor && (
                  <Group gap="xs">
                    <IconClockHour4 size={14} />
                    <Text size="sm">
                      <Trans>Next run:</Trans>{' '}
                      {moment(internalSchedule.scheduledFor).format('lll')}
                    </Text>
                  </Group>
                )}
              </Stack>
            );
          } else {
            cronHelp = null;
          }
        } catch (e) {
          isValidCron = false;
        }
        return (
          <Paper p="md" withBorder className="postybirb__scheduler">
            <Stack gap="md">
              <Group p="apart" align="center">
                <Text size="sm" fw={500}>
                  <Trans>Recurring Schedule</Trans>
                </Text>
                <SegmentedControl
                  w="100%"
                  value={cronInputMode}
                  onChange={(value: string) =>
                    setCronInputMode(value as 'builder' | 'manual')
                  }
                  data={[
                    {
                      value: 'builder',
                      label: (
                        <Group gap={5}>
                          <IconRepeat size={14} />
                          <Text size="xs">
                            <Trans>Builder</Trans>
                          </Text>
                        </Group>
                      ),
                    },
                    {
                      value: 'manual',
                      label: (
                        <Group gap={5}>
                          <IconCode size={14} />
                          <Text size="xs">
                            <Trans>Manual</Trans>
                          </Text>
                        </Group>
                      ),
                    },
                  ]}
                  size="sm"
                  radius="md"
                  transitionDuration={200}
                  transitionTimingFunction="ease"
                />
              </Group>

              {cronInputMode === 'manual' ? (
                <TextInput
                  label={
                    <Group gap="xs">
                      <Text size="sm">
                        <Trans>CRON Expression</Trans>
                      </Text>
                      <Tooltip label={<Trans>Open CRON helper website</Trans>}>
                        <Anchor
                          href="https://crontab.cronhub.io/"
                          target="_blank"
                        >
                          <IconLink size={12} />
                        </Anchor>
                      </Tooltip>
                    </Group>
                  }
                  placeholder="0 0 * * FRI"
                  description={cronHelp}
                  value={internalSchedule.cron}
                  error={
                    internalSchedule.cron && !isValidCron ? (
                      <Trans>Invalid CRON format</Trans>
                    ) : null
                  }
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
              ) : (
                <Box>
                  <CronBuilder
                    value={internalSchedule.cron || '0 0 * * *'}
                    onChange={(cronExpression) => {
                      let scheduledFor;
                      try {
                        scheduledFor = Cron(cronExpression)
                          ?.nextRun()
                          ?.toISOString();
                      } catch (e) {
                        // Do nothing
                      }
                      onUpdate({
                        ...schedule,
                        cron: cronExpression,
                        scheduledFor,
                      });
                    }}
                  />
                </Box>
              )}

              {cronInputMode === 'manual' && (
                <Text size="xs" c="dimmed">
                  <Trans>
                    Example: "0 9 * * MON" runs every Monday at 9:00 AM
                  </Trans>
                </Text>
              )}

              {isValidCron && (
                <Box p="xs" style={{ borderRadius: '4px' }}>
                  <Text size="sm" fw={500}>
                    {cronstrue.toString(internalSchedule.cron || '')}
                  </Text>
                </Box>
              )}
            </Stack>
          </Paper>
        );

      case ScheduleType.SINGLE:
      default: {
        const date = internalSchedule.scheduledFor
          ? new Date(internalSchedule.scheduledFor)
          : null;
        const isInPast = date ? date.getTime() < Date.now() : false;

        return (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <DateTimePicker
                label={<Trans>Schedule Date and Time</Trans>}
                clearable
                // eslint-disable-next-line lingui/no-unlocalized-strings
                valueFormat="YYYY-MM-DD HH:mm A"
                highlightToday
                minDate={new Date()}
                value={date}
                error={
                  isInPast ? <Trans>Date cannot be in the past</Trans> : null
                }
                submitButtonProps={{ display: 'none' }}
                onChange={(newDate) => {
                  const dateStr = newDate?.toISOString();
                  onUpdate({ ...schedule, scheduledFor: dateStr });
                  if (newDate) {
                    setLastUsedSchedule(newDate);
                    setLastKnownSetDate(dateStr);
                  }
                }}
              />
              {date && (
                <Text size="sm" color={isInPast ? 'red' : 'dimmed'}>
                  {isInPast ? (
                    <Trans>
                      Warning: This date is in the past and may not behave as
                      expected.
                    </Trans>
                  ) : (
                    <Trans>
                      This submission will be posted at the specified time.
                    </Trans>
                  )}
                </Text>
              )}
            </Stack>
          </Paper>
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
    cronInputMode,
  ]);

  return (
    <Box className="postybirb__submission-scheduler">
      <Stack gap="sm">
        <Paper p="md" withBorder>
          <Radio.Group
            description={
              <Text inherit pb="6" span display="inline-block">
                <Trans>Choose when to post this submission</Trans>
              </Text>
            }
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
            <Stack gap="6">
              {radios.map((radio) => (
                <Radio
                  key={radio.id}
                  value={radio.id}
                  label={
                    <Group gap="xs">
                      {radio.icon}
                      <span>{radio.label}</span>
                      {internalSchedule.scheduleType === radio.id && (
                        <Badge size="xs" variant="light" color="blue">
                          <Trans>Selected</Trans>
                        </Badge>
                      )}
                    </Group>
                  }
                  description={radio.description}
                />
              ))}
            </Stack>
          </Radio.Group>
        </Paper>

        {datePicker && (
          <Accordion
            variant="filled"
            radius="md"
            value={isAccordionExpanded ? 'details' : null}
            onChange={(value) => setIsAccordionExpanded(value === 'details')}
          >
            <Accordion.Item value="details">
              <Accordion.Control>
                <Group gap="xs" justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    {internalSchedule.scheduleType ===
                    ScheduleType.RECURRING ? (
                      <>
                        <IconRepeat size={16} />
                        <Text fw={500} size="sm" truncate>
                          <Trans>Recurring Schedule Settings</Trans>
                        </Text>
                      </>
                    ) : internalSchedule.scheduleType ===
                      ScheduleType.SINGLE ? (
                      <>
                        <IconCalendar size={16} />
                        <Text fw={500} size="sm" truncate>
                          <Trans>Date and Time Settings</Trans>
                        </Text>
                      </>
                    ) : (
                      <Text fw={500} size="sm" truncate>
                        <Trans>Schedule Settings</Trans>
                      </Text>
                    )}
                  </Group>

                  {internalSchedule.scheduledFor && (
                    <Group gap="xs" wrap="nowrap">
                      <IconClockHour4 size={14} />
                      <Text size="xs" c="dimmed" truncate>
                        {internalSchedule.scheduleType ===
                        ScheduleType.RECURRING ? (
                          <>
                            <Trans>Next:</Trans>{' '}
                            {moment(internalSchedule.scheduledFor).format(
                              'lll',
                            )}
                          </>
                        ) : (
                          <>
                            <Trans>Scheduled for:</Trans>{' '}
                            {moment(internalSchedule.scheduledFor).format(
                              'lll',
                            )}
                          </>
                        )}
                      </Text>
                    </Group>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>{datePicker}</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
      </Stack>
    </Box>
  );
}
