/**
 * Username Aliases drawer tour step definitions.
 * Walks the user through the username alias management drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const USER_CONVERTERS_TOUR_ID = 'user-converters';

/**
 * Returns the username aliases tour steps with translated content.
 */
export function useUserConvertersTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Username Aliases Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Username aliases automatically replace usernames in your submissions
            on a per-website basis. For example, if you mention "@ArtistJohn" in
            a description but that person goes by "@JohnDraws" on Twitter
            and "@John_Art" on DeviantArt, a username alias will automatically
            swap in the correct username for each site when posting.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="converter-create"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Create Alias</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Type the username as you write it in your descriptions (e.g.
            "ArtistJohn") and click the button to create a new alias. Then
            expand it to add website-specific replacements — for example, set
            Twitter to "@JohnDraws" and DeviantArt to "John_Art".
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
            Search for aliases by username or conversion value. Select items
            with checkboxes and hold the delete button to remove them.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="converter-card"]',
      placement: 'right',
      skipBeacon: true,
      title: <Trans>Alias Card</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each card shows a username and how many website conversions it has.
            Click the arrow to expand and see the per-website replacements. Add
            new websites using the dropdown inside. You can also set a "default"
            conversion that applies to any website without a specific entry.
          </Trans>
        </Text>
      ),
    },
  ];
}
