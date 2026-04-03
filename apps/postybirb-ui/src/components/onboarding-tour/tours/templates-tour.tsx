/**
 * Templates tour step definitions.
 * Walks the user through the templates management section.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const TEMPLATES_TOUR_ID = 'templates';

/**
 * Returns the templates tour steps with translated content.
 */
export function useTemplatesTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Templates Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Templates let you save submission settings that you reuse often.
            Create a template once and apply it to new submissions to save time.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="templates-search"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Search Templates</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Filter your templates by name. Useful when you have many templates
            saved.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="templates-type-tabs"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Template Type</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Switch between File and Message templates. File templates are for
            image or file uploads, while Message templates are for text-only
            posts.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="templates-create"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Create Template</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Click here to create a new template. Give it a name, then configure
            the submission settings you want to reuse.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="templates-card"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Template Card</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each template appears as a card. Click to select it and open the
            editor. Use the action buttons to rename, duplicate, or delete a
            template.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="templates-editor"]',
      placement: 'left',
      skipBeacon: true,
      title: <Trans>Template Editor</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            When a template is selected, its settings appear here. Configure
            titles, descriptions, tags, and website-specific options just like a
            regular submission.
          </Trans>
        </Text>
      ),
    },
  ];
}
