import { Trans } from '@lingui/macro';
import { Drawer } from '@mantine/core';
import { useFlyoutToggle } from '../../../hooks/use-flyout-toggle';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';

export function SettingsDrawer() {
  const [visible, toggle] = useFlyoutToggle('settingsVisible');
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
      title={<Trans>Settings</Trans>}
    >
      Settings
    </Drawer>
  );
}
