/**
 * Schedule drawer tour step definitions.
 * Walks the user through the calendar scheduling interface.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const SCHEDULE_TOUR_ID = 'schedule';

/**
 * Returns the schedule tour steps with translated content.
 */
export function useScheduleTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Schedule Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            The schedule view lets you plan when your submissions will be posted.
            Drag submissions onto the calendar to schedule them, or click
            existing events to manage them.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="schedule-submissions"]',
      placement: 'right',
      skipBeacon: true,
      title: <Trans>Unscheduled Submissions</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            This sidebar lists your unscheduled submissions. Drag any submission
            from here onto the calendar to schedule it for a specific date and
            time.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="schedule-calendar"]',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Calendar View</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            The calendar shows all your scheduled submissions. Switch between
            month, week, and day views. Click an event to reschedule or
            unschedule it. Drag events to move them to a different time.
          </Trans>
        </Text>
      ),
    },
  ];
}
