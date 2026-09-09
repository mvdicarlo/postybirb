import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
    Alert,
    Button,
    Group,
    Modal,
    SegmentedControl,
    Select,
    Stack,
    Switch,
    Text,
} from '@mantine/core';
import { ScheduleType } from '@postybirb/types';
import { IconCalendarOff, IconCheck } from '@tabler/icons-react';
import Cron from 'croner';
import { useRef, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import {
    useSubmissionStore,
    useUnscheduledSubmissions,
} from '../../../stores/entity/submission-store';
import {
    showScheduleUpdatedNotification,
    showUpdateErrorNotification,
} from '../../../utils/notifications';
import { DateTimePickerWithLocalization } from '../../shared/date-time-picker-with-localization/date-time-picker-with-localization';
import { CronPicker } from '../../shared/schedule-popover/cron-picker';
import { getDefaultScheduleDate, getScheduleTitle } from './schedule-utils';

export interface ScheduleRequest {
  submissionId?: string;
  date?: Date;
  allDay?: boolean;
}

export function ScheduleEditorModal({
  request,
  onClose,
}: {
  request: ScheduleRequest;
  onClose: () => void;
}) {
  const unscheduled = useUnscheduledSubmissions();
  const [submissionId, setSubmissionId] = useState<string | null>(
    request.submissionId ?? null,
  );
  const submission = useSubmissionStore((state) =>
    state.records.find((record) => record.id === submissionId),
  );
  const [date, setDate] = useState<Date | null>(() =>
    request.date
      ? getDefaultScheduleDate(request.date, request.allDay)
      : (submission?.scheduledDate ?? getDefaultScheduleDate()),
  );
  const [scheduleType, setScheduleType] = useState(
    submission?.schedule.cron ? ScheduleType.RECURRING : ScheduleType.SINGLE,
  );
  const [cron, setCron] = useState(submission?.schedule.cron ?? '0 9 * * 5');
  const [active, setActive] = useState(submission?.isScheduled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const title = submission
    ? getScheduleTitle(submission) || t`Untitled Submission`
    : t`Schedule`;
  let scheduledFor = date;
  if (scheduleType === ScheduleType.RECURRING) {
    try {
      scheduledFor = Cron(cron).nextRun() ?? null;
    } catch {
      scheduledFor = null;
    }
  }
  const invalidDate = !scheduledFor || !Number.isFinite(scheduledFor.getTime());
  const inPast = scheduledFor ? scheduledFor.getTime() <= Date.now() : false;
  const unavailable =
    !submission || submission.isArchived || submission.isPosting;

  const save = async (remove = false) => {
    if (
      unavailable ||
      pending.current ||
      (!remove && (invalidDate || (active && inPast)))
    )
      return;
    pending.current = true;
    setSaving(true);
    setError(false);
    try {
      await submissionApi.update(
        submission.id,
        remove
          ? {
              scheduleType: ScheduleType.NONE,
              scheduledFor: undefined,
              cron: undefined,
              isScheduled: false,
            }
          : {
              scheduledFor: scheduledFor?.toISOString(),
              scheduleType,
              cron: scheduleType === ScheduleType.RECURRING ? cron : undefined,
              isScheduled: active,
            },
      );
      showScheduleUpdatedNotification(title);
      onClose();
    } catch (saveError) {
      setError(true);
      showUpdateErrorNotification(
        saveError instanceof Error ? saveError.message : undefined,
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={() => {
        if (!pending.current) onClose();
      }}
      title={<Trans>Schedule</Trans>}
      centered
      size="md"
      zIndex="var(--z-popover)"
      closeOnEscape={false}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          if (!pending.current) onClose();
        }
      }}
      closeOnClickOutside={!saving}
    >
      <Stack gap="md">
        {request.submissionId ? (
          <Text fw={600} className="schedule-wrap">
            {title}
          </Text>
        ) : (
          <Select
            label={<Trans>Submission</Trans>}
            placeholder={t`Search...`}
            searchable
            value={submissionId}
            onChange={setSubmissionId}
            disabled={saving}
            data={unscheduled
              .filter((item) => !item.isPosting)
              .map((item) => ({
                value: item.id,
                label: getScheduleTitle(item) || t`Untitled Submission`,
              }))}
            nothingFoundMessage={<Trans>No submissions</Trans>}
            comboboxProps={{ withinPortal: false }}
          />
        )}
        {error && (
          <Alert color="red">
            <Trans>Update Failed</Trans>
          </Alert>
        )}
        <SegmentedControl
          value={scheduleType}
          onChange={(value) => setScheduleType(value as ScheduleType)}
          disabled={saving}
          fullWidth
          data={[
            { value: ScheduleType.SINGLE, label: t`Once` },
            { value: ScheduleType.RECURRING, label: t`Recurring` },
          ]}
        />
        <fieldset className="schedule-editor-fields" disabled={saving}>
          {scheduleType === ScheduleType.RECURRING ? (
            <CronPicker value={cron} onChange={setCron} />
          ) : (
            <DateTimePickerWithLocalization
              label={<Trans>Date and Time</Trans>}
              value={date}
              onChange={setDate}
              clearable={false}
              popoverProps={{ withinPortal: true, zIndex: 'var(--z-tooltip)' }}
              error={inPast ? <Trans>Date is in the past</Trans> : undefined}
            />
          )}
        </fieldset>
        <Text size="xs" c="dimmed">
          {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </Text>
        <Switch
          label={<Trans>Activate schedule</Trans>}
          checked={active}
          onChange={(event) => setActive(event.currentTarget.checked)}
          disabled={saving}
        />
        <Group
          justify="space-between"
          gap="xs"
          className="schedule-editor-actions"
        >
          {submission?.hasScheduleTime && (
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconCalendarOff size={16} />}
              disabled={saving || unavailable}
              onClick={() => save(true)}
            >
              <Trans>Unschedule</Trans>
            </Button>
          )}
          <Group gap="xs" ms="auto">
            <Button variant="default" onClick={onClose} disabled={saving}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={() => save()}
              loading={saving}
              disabled={unavailable || invalidDate || (active && inPast)}
            >
              <Trans>Save</Trans>
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
