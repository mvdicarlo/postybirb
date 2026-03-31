/**
 * SubmissionList - Displays unscheduled submissions that can be dragged onto the calendar.
 * Uses FullCalendar's Draggable for external drag-drop support.
 */

import { Draggable } from '@fullcalendar/interaction';
import { Trans, useLingui } from '@lingui/react/macro';
import {
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
import { useUnscheduledSubmissions } from '../../../stores/entity/submission-store';
import type { SubmissionRecord } from '../../../stores/records';
import { EmptyState } from '../../empty-state';

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
      </Group>
    </Box>
  );
}

/**
 * Submission list with search and draggable items.
 */
export function SubmissionList() {
  const { t } = useLingui();
  const allUnscheduled = useUnscheduledSubmissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply search filter and sort (base filtering done in store selector)
  const unscheduledSubmissions = useMemo(() => {
    let list = allUnscheduled;

    // Apply search filter
    if (debouncedSearch?.trim()) {
      const lowerSearch = debouncedSearch.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(lowerSearch));
    }

    // Sort alphabetically
    list = [...list].sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
    );

    return list;
  }, [allUnscheduled, debouncedSearch]);

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
            <EmptyState preset="no-results" size="sm" />
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
