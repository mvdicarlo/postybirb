/**
 * User Converters drawer tour step definitions.
 * Walks the user through the user converter management drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const USER_CONVERTERS_TOUR_ID = 'user-converters';

/**
 * Returns the user converters tour steps with translated content.
 */
export function useUserConvertersTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>User Converters Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            User converters automatically replace usernames on a per-website
            basis. Useful when the same person has different usernames across
            sites.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="converter-create"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Create Converter</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Type a username and click the button to create a new converter. Then
            expand it to set up website-specific replacements.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="converter-search"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Search &amp; Delete</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Search for converters by username or conversion value. Select items
            with checkboxes and hold the delete button to remove them.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="converter-card"]',
      placement: 'right',
      skipBeacon: true,
      title: <Trans>Converter Card</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each card shows a username and how many website conversions it has.
            Click the arrow to expand and see the per-website replacements. Add
            new websites using the dropdown inside.
          </Trans>
        </Text>
      ),
    },
  ];
}
