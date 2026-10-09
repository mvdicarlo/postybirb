/**
 * Tag Groups drawer tour step definitions.
 * Walks the user through the tag groups management drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const TAG_GROUPS_TOUR_ID = 'tag-groups';

/**
 * Returns the tag groups tour steps with translated content.
 */
export function useTagGroupsTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Tag Groups Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Tag groups let you save collections of tags under a name. When
            creating a submission, pick a tag group to quickly add all its tags
            at once.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="tag-groups-create"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Create Tag Group</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Type a name and click the button to create a new tag group. You can
            then add tags to it in the table below.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="tag-groups-search"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Search &amp; Delete</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Search for tag groups by name. Select rows using the checkboxes,
            then hold the delete button to remove them.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="tag-groups-table"]',
      placement: 'right',
      skipBeacon: true,
      title: <Trans>Tag Groups Table</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each row shows a tag group with its name and tags. Click the name to
            rename it. Add or remove tags directly in the tags column.
          </Trans>
        </Text>
      ),
    },
  ];
}
