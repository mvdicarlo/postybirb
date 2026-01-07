/**
 * CustomLoginPlaceholder - Renders custom login components for websites.
 * Falls back to a placeholder if the login component is not yet implemented.
 */

import { Trans } from '@lingui/react/macro';
import { IconLogin } from '@tabler/icons-react';
import type { AccountRecord } from '../../../stores/records/account-record';
import type { WebsiteRecord } from '../../../stores/records/website-record';
import { EmptyState } from '../../empty-state';
import { getLoginViewComponent } from '../../website-login-views';
import { WithNotifyLoginSuccessProp } from './accounts-content';

interface CustomLoginPlaceholderProps extends WithNotifyLoginSuccessProp {
  /** The account being logged into */
  account: AccountRecord;
  /** The website configuration */
  website: WebsiteRecord;
  /** Name of the custom login component */
  loginComponentName: string;
}

/**
 * Renders the custom login component for a website.
 * Falls back to a placeholder if the component is not implemented.
 */
export function CustomLoginPlaceholder({
  account,
  website,
  loginComponentName,
  notifyLoginSuccess,
}: CustomLoginPlaceholderProps) {
  const LoginComponent = getLoginViewComponent(loginComponentName);

  // Render the actual login component if available
  if (LoginComponent) {
    return (
      <LoginComponent
        account={account}
        website={website}
        data={account.data}
        notifyLoginSuccess={notifyLoginSuccess}
      />
    );
  }

  // Fallback placeholder for unimplemented login components
  return (
    <EmptyState
      icon={<IconLogin size={32} stroke={1.5} />}
      message={<Trans>Custom login for {website.displayName}</Trans>}
      description={
        <Trans>
          This website uses a custom login form. Support coming soon.
        </Trans>
      }
      size="lg"
    />
  );
}
