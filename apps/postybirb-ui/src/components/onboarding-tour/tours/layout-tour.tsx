/**
 * Layout tour step definitions.
 * Walks the user through the main sidebar navigation items.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

/**
 * Returns the layout tour steps with translated content.
 * Must be called inside a React component for i18n context.
 */
export function useLayoutTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Welcome to PostyBirb!</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Let&apos;s take a quick tour of the interface. We&apos;ll walk you
            through the main features so you can start posting right away.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="home"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Home Dashboard</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            This is your dashboard. View submission status, control the post
            queue, and see an overview of your activity.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="accounts"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Accounts</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Set up your website accounts here. Log in to the sites you want to
            post to before creating submissions.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="file-submissions"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Post Files</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Create and manage file submissions — images, videos, and other media
            you want to post across your accounts.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="message-submissions"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Send Messages</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Send text-only posts like journals, status updates, or announcements
            to your accounts.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="templates"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Templates</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Save submission settings as reusable templates. Great for repeated
            posts with the same tags, description, or account selection.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="schedule"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Schedule</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            View and manage scheduled posts on a calendar. Plan your posting
            schedule in advance.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="tag-groups"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Tag Groups</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Create reusable sets of tags that you can quickly apply to any
            submission. Saves time when you use the same tags often.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="custom-shortcuts"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Custom Shortcuts</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Define text shortcuts to use in descriptions. Type a short code and
            it expands into your full text.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="file-watchers"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>File Watchers</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Automatically import files from watched folders on your computer.
            New files are picked up and turned into submissions.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="settings"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 100,
      title: <Trans>Settings</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Configure application preferences, manage your data, and customize
            your PostyBirb experience.
          </Trans>
        </Text>
      ),
    },
  ];
}

export const LAYOUT_TOUR_ID = 'layout';
