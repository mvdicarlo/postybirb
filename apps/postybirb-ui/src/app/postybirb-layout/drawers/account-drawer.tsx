import { Trans } from '@lingui/macro';
import { Drawer } from '@mantine/core';
import { useFlyoutToggle } from '../../../hooks/use-flyout-toggle';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';

export function AccountDrawer() {
  const [visible, toggle] = useFlyoutToggle('accountFlyoutVisible');
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
      Account
    </Drawer>
  );
}
