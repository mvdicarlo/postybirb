/**
 * ScheduleDrawer - Calendar-based scheduling interface for submissions.
 * Allows drag-and-drop scheduling with FullCalendar.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Group } from '@mantine/core';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui/drawer-store';
import { SectionDrawer } from '../section-drawer';
import { ScheduleCalendar } from './schedule-calendar';
import './schedule-drawer.css';
import { SubmissionList } from './submission-list';

/**
 * Schedule drawer with calendar and draggable submission list.
 */
export function ScheduleDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === 'schedule';

  return (
    <SectionDrawer
      opened={opened}
      onClose={closeDrawer}
      title={<Trans>Schedule</Trans>}
      width="100vw"
    >
      <Group
        align="stretch"
        gap="md"
        wrap="nowrap"
        className="schedule-drawer-content"
      >
        {/* Unscheduled submissions list */}
        <Box className="schedule-drawer-sidebar">
          <SubmissionList />
        </Box>

        {/* Calendar view */}
        <Box className="schedule-drawer-calendar">
          <ScheduleCalendar />
        </Box>
      </Group>
    </SectionDrawer>
  );
}
