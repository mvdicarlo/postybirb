/**
 * CustomLoginPlaceholder - Placeholder component for custom login websites.
 * Will be replaced with actual custom login components in the future.
 */

import { Trans } from '@lingui/react/macro';
import { IconLogin } from '@tabler/icons-react';
import { EmptyState } from '../../empty-state';

interface CustomLoginPlaceholderProps {
  /** Name of the website for display */
  websiteName: string;
  /** Name of the custom login component (for future implementation) */
  loginComponentName: string;
}

/**
 * Placeholder component shown for websites that use custom login.
 * This will be replaced with the actual custom login component integration.
 */
export function CustomLoginPlaceholder({
  websiteName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loginComponentName,
}: CustomLoginPlaceholderProps) {
  return (
    <EmptyState
      icon={<IconLogin size={32} stroke={1.5} />}
      message={<Trans>Custom login for {websiteName}</Trans>}
      description={
        <Trans>
          This website uses a custom login form. Support coming soon.
        </Trans>
      }
      size="lg"
    />
  );
}
