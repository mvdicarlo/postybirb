import { Trans } from '@lingui/macro';
import { Drawer, Loader, Space, Stack } from '@mantine/core';
import { useWebsites } from '../../../../hooks/account/use-websites';
import { useFlyoutToggle } from '../../../../hooks/use-flyout-toggle';
import {
  getOverlayOffset,
  getPortalTarget,
  marginOffset,
} from '../drawer.util';
import { WebsiteCard } from './website-card';
import { WebsiteVisibilityPicker } from './website-visibility-picker';

export function AccountDrawer() {
  const [visible, toggle] = useFlyoutToggle('accountFlyoutVisible');
  const { accounts, isLoading, filteredWebsites } = useWebsites();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Drawer
      closeOnClickOutside
      ml={-marginOffset}
      portalProps={{
        target: getPortalTarget(),
      }}
      overlayProps={{
        left: getOverlayOffset(),
        zIndex: 0,
      }}
      trapFocus
      opened={visible}
      onClose={() => toggle()}
      title={<Trans>Accounts</Trans>}
    >
      <WebsiteVisibilityPicker />
      <Space h="md" />
      <Stack gap="md">
        {filteredWebsites.map((website) => (
          <WebsiteCard
            key={website.id}
            website={website}
            accounts={accounts.filter(
              (account) => account.website === website.id
            )}
          />
        ))}
      </Stack>
    </Drawer>
  );
}
