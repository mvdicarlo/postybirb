import { Trans } from '@lingui/macro';
import { AppShell, Box, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconFile,
    IconHome,
    IconMessage,
    IconSettings,
    IconUser,
} from '@tabler/icons-react';
import { Outlet } from 'react-router';
import {
    FileSubmissionPath,
    HomePath,
    MessageSubmissionPath,
} from '../../pages/route-paths';
import {
    AccountKeybinding,
    FileSubmissionsKeybinding,
    HomeKeybinding,
    MessageSubmissionsKeybinding,
    SettingsKeybinding,
} from '../../shared/app-keybindings';
import { AccountDrawer } from './drawers/account-drawer';
import { SettingsDrawer } from './drawers/settings-drawer';
import { LanguagePicker } from './language-picker';
import { SideNavLink, SideNavLinkProps } from './side-nav-link';
import { ThemePicker } from './theme-picker';

function AppImage() {
  return (
    // eslint-disable-next-line lingui/no-unlocalized-strings
    <img src="/app-icon.png" alt="postybirb icon" width="30" height="30" />
  );
}

const navigationTargets: (SideNavLinkProps & {
  key: string;
})[] = [
  {
    type: 'drawer',
    key: 'home',
    globalStateKey: 'accountFlyoutVisible',
    icon: <IconUser />,
    label: <Trans>Accounts</Trans>,
    kbd: AccountKeybinding,
  },
  {
    type: 'link',
    key: 'home',
    icon: <IconHome />,
    label: <Trans>Home</Trans>,
    location: HomePath,
    kbd: HomeKeybinding,
  },
  {
    type: 'link',
    key: 'home',
    icon: <IconFile />,
    label: <Trans>Post Files</Trans>,
    location: FileSubmissionPath,
    kbd: FileSubmissionsKeybinding,
  },
  {
    type: 'link',
    key: 'home',
    icon: <IconMessage />,
    label: <Trans>Send Messages</Trans>,
    location: MessageSubmissionPath,
    kbd: MessageSubmissionsKeybinding,
  },
  {
    type: 'drawer',
    key: 'home',
    globalStateKey: 'settingsVisible',
    icon: <IconSettings />,
    label: <Trans>Settings</Trans>,
    kbd: SettingsKeybinding,
  },
];

export function PostyBirbLayout() {
  const [sideNavToggled, { toggle: toggleSideNav }] = useDisclosure(true);

  return (
    <AppShell
      navbar={{
        width: sideNavToggled ? 60 : 240,
        breakpoint: 'sm',
      }}
      padding="md"
    >
      <AppShell.Navbar id="postybirb__navbar">
        <Box ta="center" p="5">
          <AppImage />
          <hr style={{ borderColor: 'var(--mantine-color-dimmed)' }} />
        </Box>
        <Box ta="center">
          <Burger opened={!sideNavToggled} onClick={toggleSideNav} size="md" />
        </Box>
        <Box ta="center">
          <ThemePicker />
        </Box>
        <Box ta="center">
          <LanguagePicker />
        </Box>
        <Box ta={sideNavToggled ? 'center' : undefined}>
          {navigationTargets.map((target) => (
            <SideNavLink {...target} collapsed={sideNavToggled} />
          ))}
        </Box>
      </AppShell.Navbar>
      <AppShell.Main>
        <Box id="postybirb__main" className="postybirb__layout" pos="relative">
          <AccountDrawer />
          <SettingsDrawer />
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
