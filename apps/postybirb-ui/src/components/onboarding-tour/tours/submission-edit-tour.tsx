/**
 * Submission edit card tour step definitions.
 * Walks the user through the submission editor.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const SUBMISSION_EDIT_TOUR_ID = 'submission-edit';

/**
 * Returns the submission edit card tour steps with translated content.
 */
export function useSubmissionEditTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Submission Editor Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            This is the submission editor where you configure all the details
            for your post. Set up files, scheduling, descriptions, tags, and
            per-website options.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="edit-card-header"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Card Header</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            The header shows the submission title and action buttons. Use the
            template button to apply saved settings, the send button to post,
            and the trash button to delete.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="edit-card-files"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>File Management</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Upload and manage files for your submission. Drag to reorder, click
            to preview, and edit alt text or metadata.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="edit-card-schedule"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Schedule</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Schedule when your submission should be posted. Choose a one-time
            date or set up a recurring schedule with a CRON expression. Toggle
            scheduling on or off with the switch.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="edit-card-defaults"]',
      placement: 'bottom',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Default Options</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Set the default title, description, tags, and content rating here.
            These values are inherited by all website-specific options unless
            you override them individually.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="edit-card-accounts"]',
      placement: 'bottom',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Account Selection</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Choose which accounts to post to. Click to open the dropdown, then
            select individual accounts or entire website groups.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="edit-card-website-forms"]',
      placement: 'center',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Website-Specific Options</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each selected website gets its own form where you can override the
            defaults. Customize titles, descriptions, tags, and site-specific
            fields like folders or ratings per website.
          </Trans>
        </Text>
      ),
    },
  ];
}
