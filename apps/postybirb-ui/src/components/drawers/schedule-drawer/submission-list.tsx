/**
 * SubmissionList - Displays unscheduled submissions that can be dragged onto the calendar.
 * Uses FullCalendar's Draggable for external drag-drop support.
 */

import { Draggable } from '@fullcalendar/interaction';
import { Trans, useLingui } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Group,
    Image,
    ScrollArea,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import {
    IconCalendarPlus,
    IconFile,
    IconGripVertical,
    IconMessage,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUnscheduledSubmissions } from '../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../stores/records';
import { getBaseUrl } from '../../../transports/http-client';
import { EmptyState } from '../../empty-state';
import { getScheduleTitle } from './schedule-utils';

/**
 * Single draggable submission item.
 */
function DraggableSubmissionItem({
  submission,
  onSchedule,
}: {
  submission: SubmissionRecord;
  onSchedule: (submissionId: string) => void;
}) {
  const { t } = useLingui();
  const title = getScheduleTitle(submission) || t`Untitled Submission`;
  const isMessage = submission.type === SubmissionType.MESSAGE;
  const file = submission.primaryFile;
  const preview = file?.hasThumbnail
    ? `${getBaseUrl()}/api/file/thumbnail/${file.id}?${file.hash}`
    : file?.mimeType.startsWith('image/')
      ? `${getBaseUrl()}/api/file/file/${file.id}?${file.hash}`
      : undefined;

  return (
    <div
      className={`schedule-submission ${submission.isPosting ? '' : 'calendar-draggable'}`}
      data-submission-id={submission.id}
      data-submission-title={title}
    >
      <IconGripVertical
        size={14}
        className="schedule-submission-grip"
        aria-hidden="true"
      />
      <UnstyledButton
        className="schedule-submission-main"
        onClick={() => onSchedule(submission.id)}
        disabled={submission.isPosting}
      >
        <span
          className={`schedule-submission-preview ${isMessage ? 'schedule-submission-message' : ''}`}
        >
          {preview ? (
            <Image
              src={preview}
              alt=""
              fit="cover"
              h={40}
              w={40}
              loading="lazy"
            />
          ) : isMessage ? (
            <IconMessage size={20} />
          ) : (
            <IconFile size={20} />
          )}
        </span>
        <span className="schedule-submission-copy">
          <Text
            size="sm"
            fw={500}
            lineClamp={2}
            className="schedule-wrap"
            title={title}
          >
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {isMessage ? (
              <Trans>Message</Trans>
            ) : (
              <Trans>Files ({submission.files.length})</Trans>
            )}
          </Text>
        </span>
      </UnstyledButton>
      <Tooltip label={<Trans>Schedule</Trans>}>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={t`Schedule`}
          onClick={() => onSchedule(submission.id)}
          disabled={submission.isPosting}
        >
          <IconCalendarPlus size={17} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}

/**
 * Submission list with search and draggable items.
 */
export function SubmissionList({
  onSchedule,
}: {
  onSchedule: (submissionId: string) => void;
}) {
  const { t } = useLingui();
  const allUnscheduled = useUnscheduledSubmissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply search filter and sort (base filtering done in store selector)
  const unscheduledSubmissions = useMemo(() => {
    let list = allUnscheduled.filter(
      (submission) => filter === 'all' || submission.type === filter,
    );

    // Apply search filter
    if (debouncedSearch?.trim()) {
      const lowerSearch = debouncedSearch.trim().toLowerCase();
      list = list.filter((submission) =>
        getScheduleTitle(submission).toLowerCase().includes(lowerSearch),
      );
    }

    // Sort alphabetically
    list = [...list].sort((a, b) =>
      getScheduleTitle(a)
        .toLowerCase()
        .localeCompare(getScheduleTitle(b).toLowerCase()),
    );

    return list;
  }, [allUnscheduled, debouncedSearch, filter]);

  // Initialize FullCalendar Draggable on mount
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const draggable = new Draggable(containerRef.current, {
      itemSelector: '.calendar-draggable',
      eventData: (eventEl) => {
        const submissionId = eventEl.getAttribute('data-submission-id');
        return {
          id: submissionId,
          title: eventEl.getAttribute('data-submission-title') ?? '',
          create: false,
          duration: { hours: 0, minutes: 30 },
        };
      },
    });

    return () => {
      draggable.destroy();
    };
  }, []);

  return (
    <Stack gap="sm" h="100%" className="schedule-submission-list">
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600} size="sm">
          <Trans>Unscheduled Submissions</Trans>
        </Text>
        <Badge color="gray" variant="light" size="sm">
          {allUnscheduled.length}
        </Badge>
      </Group>

      <TextInput
        placeholder={t`Search...`}
        aria-label={t`Search submissions`}
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="sm"
        rightSection={
          searchQuery ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t`Clear search`}
              onClick={() => setSearchQuery('')}
            >
              <IconX size={14} />
            </ActionIcon>
          ) : undefined
        }
      />
      <SegmentedControl
        size="xs"
        value={filter}
        onChange={setFilter}
        fullWidth
        aria-label={t`Submission type`}
        data={[
          { value: 'all', label: t`All` },
          { value: SubmissionType.FILE, label: t`File` },
          { value: SubmissionType.MESSAGE, label: t`Message` },
        ]}
      />

      <ScrollArea
        style={{ flex: 1, minHeight: 0 }}
        type="auto"
        offsetScrollbars
        scrollbarSize={6}
      >
        <Stack gap="xs" ref={containerRef}>
          {unscheduledSubmissions.length === 0 ? (
            <EmptyState preset="no-results" size="sm" />
          ) : (
            unscheduledSubmissions.map((submission) => (
              <DraggableSubmissionItem
                key={submission.id}
                submission={submission}
                onSchedule={onSchedule}
              />
            ))
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
