/**
 * Submissions section tour step definitions.
 * Walks the user through the submissions list and editor.
 * Used for both file and message submission views.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const SUBMISSIONS_TOUR_ID = 'submissions';

/**
 * Returns the submissions tour steps with translated content.
 */
export function useSubmissionsTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Submissions Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            This is where you create and manage your submissions. Build your
            posts, configure per-website options, and send them out to all your
            accounts.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="submissions-select-all"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Select All</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Use this checkbox to select or deselect all submissions at once.
            When items are selected, bulk actions like delete, post, and apply
            template become available.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="submissions-create"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Create Submission</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Click here to create a new submission. For file submissions, this
            opens a file picker. For messages, enter a title to get started.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="submissions-dropzone"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>File Dropzone</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Drag and drop files here to quickly create new file submissions. You
            can also click to browse your file system.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="submissions-search"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Search Submissions</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Filter your submissions by title. Useful when you have many
            submissions in your list.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="submissions-filter"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Status Filter</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Filter submissions by status — view all, only queued, or only
            scheduled submissions. Use the icon on the right to toggle between
            compact and detailed views.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="submissions-card"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Submission Card</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each submission appears as a card showing its title, status badges,
            and action buttons. Click to select it and open the editor. Drag to
            reorder your submissions.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="submissions-editor"]',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Submission Editor</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            When a submission is selected, its full editor appears here.
            Configure titles, descriptions, tags, file options, and
            website-specific settings. Use the Mass Edit toggle to edit multiple
            submissions at once.
          </Trans>
        </Text>
      ),
    },
  ];
}
