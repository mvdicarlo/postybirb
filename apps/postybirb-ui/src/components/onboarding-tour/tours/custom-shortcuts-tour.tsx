/**
 * Custom Shortcuts drawer tour step definitions.
 * Walks the user through the custom shortcuts management drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const CUSTOM_SHORTCUTS_TOUR_ID = 'custom-shortcuts';

/**
 * Returns the custom shortcuts tour steps with translated content.
 */
export function useCustomShortcutsTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Custom Shortcuts Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Custom shortcuts let you define reusable text snippets with rich
            formatting. Use them in description fields by typing their shortcut
            name to quickly insert common content.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="shortcuts-create"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Create Shortcut</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Click here to create a new shortcut. Give it a unique name that
            you&apos;ll use to reference it in your descriptions.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="shortcuts-search"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Search Shortcuts</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Filter your shortcuts by name. Useful when you have many shortcuts
            defined.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="shortcuts-card"]',
      placement: 'right',
      skipBeacon: true,
      title: <Trans>Shortcut Card</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each shortcut shows its name. Click the arrow to expand it and edit
            the rich text content. Click the name to rename it. Use the delete
            button to remove it.
          </Trans>
        </Text>
      ),
    },
  ];
}
