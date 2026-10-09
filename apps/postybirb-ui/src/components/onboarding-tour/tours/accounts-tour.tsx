/**
 * Accounts tour step definitions.
 * Walks the user through the accounts management section.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const ACCOUNTS_TOUR_ID = 'accounts';

/**
 * Returns the accounts tour steps with translated content.
 */
export function useAccountsTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Accounts Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            This is where you manage your website accounts. Add accounts, log
            in, and track your login status across all supported sites.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="accounts-search"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Search Accounts</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Filter the list by typing a website name or account name. Useful
            when you have many accounts set up.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="accounts-login-filter"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Login Status Filter</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Quickly find accounts that need attention. Filter by All, Logged in,
            or Not logged in status.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="accounts-visibility"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Website Visibility</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Hide websites you don&apos;t use to keep the list clean. Hidden
            websites won&apos;t appear in the accounts list or when creating
            submissions.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="accounts-website-card"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Website Cards</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each website has its own card. Click the header to expand or collapse
            it. The badge shows how many accounts are logged in out of the total.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="accounts-add-account"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Adding Accounts</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Click &quot;Add account&quot; to create a new account for a website.
            You can have multiple accounts per website for posting to different
            profiles.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="accounts-account-row"]',
      placement: 'right',
      skipBeacon: true,
      scrollOffset: 150,
      title: <Trans>Account Details</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each account shows its name, username, and login status. Click the
            name to rename it. Use the action buttons to log in, reset, or
            delete the account.
          </Trans>
        </Text>
      ),
    },
  ];
}
