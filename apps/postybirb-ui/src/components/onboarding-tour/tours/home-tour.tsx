/**
 * Home dashboard tour step definitions.
 * Walks the user through the dashboard panels and stats.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const HOME_TOUR_ID = 'home';

/**
 * Returns the home dashboard tour steps with translated content.
 */
export function useHomeTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Dashboard Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            This is your home dashboard. It gives you a quick overview of your
            submissions, schedule, and account health at a glance.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home-queue-control"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Queue Control</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Pause or resume your post queue. When paused, no submissions will be
            sent until you resume.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home-stat-cards"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Submission Stats</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Quick counts of your file and message submissions, plus how many are
            queued or scheduled. Click any card to navigate to that section.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home-schedule-calendar"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Schedule Calendar</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            A mini calendar showing which days have scheduled posts. Click on a
            highlighted day to see what&apos;s planned.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home-recent-activity"]',
      placement: 'left',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Recent Activity</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Shows your latest notifications — successful posts, errors, and
            warnings. Helps you stay on top of what&apos;s happening.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home-upcoming-posts"]',
      placement: 'top',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Upcoming Posts</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Lists your next scheduled submissions with their planned times.
            Click a post to jump to its editor.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home-validation-issues"]',
      placement: 'top',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Validation Issues</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Submissions with errors or warnings appear here. Fix any issues
            before posting to avoid failed submissions.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home-account-health"]',
      placement: 'top',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Account Health</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Shows how many of your accounts are logged in. If any accounts need
            attention, you&apos;ll see a warning here.
          </Trans>
        </Text>
      ),
    },
  ];
}
