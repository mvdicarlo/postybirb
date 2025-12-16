/**
 * SubmissionList - Displays unscheduled submissions that can be dragged onto the calendar.
 * Uses FullCalendar's Draggable for external drag-drop support.
 */

import { Draggable } from '@fullcalendar/interaction';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  Badge,
  Box,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import { IconFile, IconMessage, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubmissionRecord } from '../../../stores/records';
import { useSubmissions } from '../../../stores/submission-store';

/**
 * Single draggable submission item.
 */
function DraggableSubmissionItem({
  submission,
}: {
  submission: SubmissionRecord;
}) {
  const { t } = useLingui();
  const title = submission.title || t`Untitled Submission`;
  const isMessage = submission.type === SubmissionType.MESSAGE;

  return (
    <Box
      className="calendar-draggable"
      data-submission-id={submission.id}
      style={{
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon
          size="sm"
          variant="light"
          color={isMessage ? 'green' : 'blue'}
        >
          {isMessage ? <IconMessage size={14} /> : <IconFile size={14} />}
        </ThemeIcon>
        <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
          {title}
        </Text>
        <Badge size="xs" variant="dot" color={isMessage ? 'green' : 'blue'}>
          {isMessage ? <Trans>MSG</Trans> : <Trans>FILE</Trans>}
        </Badge>
      </Group>
    </Box>
  );
}

/**
 * Submission list with search and draggable items.
 */
export function SubmissionList() {
  const { t } = useLingui();
  const submissions = useSubmissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get unscheduled submissions (no scheduledFor, not archived, not template)
  const unscheduledSubmissions = useMemo(() => {
    let list = submissions.filter(
      (s) =>
        !s.isArchived &&
        !s.isTemplate &&
        !s.schedule.scheduledFor &&
        !s.schedule.cron,
    );

    // Apply search filter
    if (debouncedSearch?.trim()) {
      const lowerSearch = debouncedSearch.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(lowerSearch));
    }

    // Sort alphabetically
    list.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
    );

    return list;
  }, [submissions, debouncedSearch]);

  // Initialize FullCalendar Draggable on mount
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const draggable = new Draggable(containerRef.current, {
      itemSelector: '.calendar-draggable',
      eventData: (eventEl) => {
        const submissionId = eventEl.getAttribute('data-submission-id');
        // eslint-disable-next-line lingui/no-unlocalized-strings
        const textContent = eventEl.textContent || 'Untitled';
        return {
          id: submissionId,
          title: textContent.trim(),
          duration: { hours: 0, minutes: 30 },
        };
      },
    });

    return () => {
      draggable.destroy();
    };
  }, []);

  return (
    <Stack gap="md" h="100%">
      <Text fw={600} size="sm">
        <Trans>Unscheduled Submissions</Trans>
      </Text>

      <TextInput
        placeholder={t`Search...`}
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="sm"
      />

      <ScrollArea
        style={{ flex: 1 }}
        type="auto"
        offsetScrollbars
        scrollbarSize={6}
      >
        <Stack gap="xs" ref={containerRef}>
          {unscheduledSubmissions.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {debouncedSearch ? (
                <Trans>No matching submissions</Trans>
              ) : (
                <Trans>All submissions are scheduled</Trans>
              )}
            </Text>
          ) : (
            unscheduledSubmissions.map((submission) => (
              <DraggableSubmissionItem
                key={submission.id}
                submission={submission}
              />
            ))
          )}
        </Stack>
      </ScrollArea>

      <Text size="xs" c="dimmed">
        <Trans>Drag submissions onto the calendar to schedule them</Trans>
      </Text>
    </Stack>
  );
}
