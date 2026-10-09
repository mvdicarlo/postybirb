/**
 * File Watchers drawer tour step definitions.
 * Walks the user through the file watcher management drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const FILE_WATCHERS_TOUR_ID = 'file-watchers';

/**
 * Returns the file watchers tour steps with translated content.
 */
export function useFileWatchersTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>File Watchers Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            File watchers monitor folders on your computer and automatically
            create submissions when new files appear. Great for streamlining
            your upload workflow.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="file-watchers-create"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Create Watcher</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Click to create a new file watcher. You&apos;ll then configure which
            folder to watch and what to do with new files.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="file-watchers-card"]',
      placement: 'right',
      skipBeacon: true,
      title: <Trans>Watcher Settings</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each watcher card lets you pick a folder path, choose an import
            action, and optionally apply a template to imported files. Save your
            changes or delete the watcher using the buttons at the bottom.
          </Trans>
        </Text>
      ),
    },
  ];
}
