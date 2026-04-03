/**
 * Tag Converters drawer tour step definitions.
 * Walks the user through the tag converter management drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const TAG_CONVERTERS_TOUR_ID = 'tag-converters';

/**
 * Returns the tag converters tour steps with translated content.
 */
export function useTagConvertersTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Tag Converters Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Tag converters automatically replace tags on a per-website basis.
            Useful when different sites use different tag names for the same
            concept.
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
            Type a tag name and click the button to create a new converter. Then
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
            Search for converters by name or conversion value. Select items with
            checkboxes and hold the delete button to remove them.
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
            Each card shows a tag and how many website conversions it has. Click
            the arrow to expand and see the per-website replacements. Add new
            websites using the dropdown inside.
          </Trans>
        </Text>
      ),
    },
  ];
}
