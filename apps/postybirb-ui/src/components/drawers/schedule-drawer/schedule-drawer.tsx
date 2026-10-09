/**
 * ScheduleDrawer - Calendar-based scheduling interface for submissions.
 * Allows drag-and-drop scheduling with FullCalendar.
 */

import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ActionIcon, Box, Group, Tooltip } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { useState } from 'react';
import {
  useActiveDrawer,
  useDrawerActions,
} from '../../../stores/ui/drawer-store';
import { useTourActions } from '../../../stores/ui/tour-store';
import { SCHEDULE_TOUR_ID } from '../../onboarding-tour/tours/schedule-tour';
import { SectionDrawer } from '../section-drawer';
import { ScheduleCalendar } from './schedule-calendar';
import './schedule-drawer.css';
import { ScheduleEditorModal, ScheduleRequest } from './schedule-editor-modal';
import { SubmissionList } from './submission-list';

/**
 * Schedule drawer with calendar and draggable submission list.
 */
export function ScheduleDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const { startTour } = useTourActions();
  const opened = activeDrawer === 'schedule';
  const [queueOpen, setQueueOpen] = useState(() => window.innerWidth > 900);
  const [scheduleRequest, setScheduleRequest] =
    useState<ScheduleRequest | null>(null);

  return (
    <SectionDrawer
      opened={opened}
      onClose={() => {
        setScheduleRequest(null);
        closeDrawer();
      }}
      closeOnEscape={!scheduleRequest}
      title={
        <Group gap="xs">
          <Trans>Schedule</Trans>
          <Tooltip label={<Trans>Schedule Tour</Trans>}>
            <ActionIcon
              variant="subtle"
              size="xs"
              aria-label={t`Schedule Tour`}
              onClick={() => {
                setQueueOpen(true);
                startTour(SCHEDULE_TOUR_ID);
              }}
            >
              <IconHelp size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      width="100vw"
    >
      <Group
        align="stretch"
        gap={0}
        wrap="nowrap"
        className="schedule-drawer-content"
        data-queue-open={queueOpen || undefined}
      >
        {/* Unscheduled submissions list */}
        <Box
          data-tour-id="schedule-submissions"
          className="schedule-drawer-sidebar"
        >
          <SubmissionList
            onSchedule={(submissionId) => setScheduleRequest({ submissionId })}
          />
        </Box>

        {/* Calendar view */}
        <Box
          data-tour-id="schedule-calendar"
          className="schedule-drawer-calendar"
        >
          <ScheduleCalendar
            onSchedule={setScheduleRequest}
            queueOpen={queueOpen}
            onToggleQueue={() => setQueueOpen((value) => !value)}
          />
        </Box>
      </Group>
      {scheduleRequest && (
        <ScheduleEditorModal
          request={scheduleRequest}
          onClose={() => setScheduleRequest(null)}
        />
      )}
    </SectionDrawer>
  );
}
