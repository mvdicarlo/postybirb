import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const POST_PREVIEW_TOUR_ID = 'post-preview';
export const BULK_POST_PREVIEW_TOUR_ID = 'bulk-post-preview';

export function usePostPreviewTourSteps(bulk = false): Step[] {
  const prefix = bulk ? BULK_POST_PREVIEW_TOUR_ID : POST_PREVIEW_TOUR_ID;

  return [
    {
      target: `[data-tour-id="${prefix}-scope"]`,
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Choose What To Post</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Incomplete work picks up where you left off, skipping successful
            posts. Selected targets posts only what you choose, including
            anything you've posted before.
          </Trans>
        </Text>
      ),
    },
    {
      target: `[data-tour-id="${prefix}-work"]`,
      placement: 'bottom',
      skipBeacon: true,
      title: bulk ? <Trans>Posting Order</Trans> : <Trans>Will Post</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          {bulk ? (
            <Trans>
              This is the order submissions will start, not necessarily finish.
              Each unit is one file or message for one account. Submissions with
              no selected work are left out.
            </Trans>
          ) : (
            <Trans>
              Each unit is one file or message for one account. The same file
              going to three accounts counts as three units.
            </Trans>
          )}
        </Text>
      ),
    },
    {
      target: `[data-tour-id="${prefix}-work"]`,
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Ready And Waiting Work</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Waiting work is included, but needs a cooldown, earlier work, or a
            dependency to finish first. Paused posting holds all work until
            you resume.
          </Trans>
        </Text>
      ),
    },
    {
      target: `[data-tour-id="${prefix}-work"]`,
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Dependencies Before Posting</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          {bulk ? (
            <Trans>
              Dependencies still apply, regardless of batch order. A post waits
              for all its prerequisites to finish successfully. Any unfinished
              prerequisites outside this batch must be started separately.
            </Trans>
          ) : (
            <Trans>
              Dependencies must finish successfully before this post can start.
              Start or schedule them separately; failed or cancelled
              prerequisites keep this post waiting. Set dependencies in the
              submission editor.
            </Trans>
          )}
        </Text>
      ),
    },
    {
      target: `[data-tour-id="${prefix}-selection"]`,
      placement: 'top',
      skipBeacon: true,
      title: <Trans>Select Targets Or Post Again</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Selecting previously successful work creates a new post on the
            website, not an update to the original. In Incomplete work mode,
            Post again adds it to the unfinished work.
          </Trans>
        </Text>
      ),
    },
  ];
}