/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import { AppShell, Box, Burger, Divider, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import {
  IconFile,
  IconHome,
  IconMessage,
  IconSearch,
  IconSettings,
  IconTags,
  IconTransform,
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
  TagConvertersKeybinding,
  TagGroupsKeybinding,
} from '../../shared/app-keybindings';
import { AccountDrawer } from './drawers/account-drawer/account-drawer';
import { SettingsDrawer } from './drawers/settings-drawer';
import { TagConverterDrawer } from './drawers/tag-converter-drawer';
import { TagGroupDrawer } from './drawers/tag-group-drawer';
import { LanguagePicker } from './language-picker';
import classes from './postybirb-layout.module.css';
import { PostybirbSpotlight } from './postybirb-spotlight/postybirb-spotlight';
import { PostyBirbUpdateButton } from './postybirb-update-button';
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
    key: 'accounts',
    globalStateKey: 'accountDrawerVisible',
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
    key: 'post',
    icon: <IconFile />,
    label: <Trans>Post Files</Trans>,
    location: FileSubmissionPath,
    kbd: FileSubmissionsKeybinding,
  },
  {
    type: 'link',
    key: 'message',
    icon: <IconMessage />,
    label: <Trans>Send Messages</Trans>,
    location: MessageSubmissionPath,
    kbd: MessageSubmissionsKeybinding,
  },
  {
    type: 'drawer',
    key: 'tag-groups',
    icon: <IconTags />,
    label: <Trans>Tag Groups</Trans>,
    globalStateKey: 'tagGroupsDrawerVisible',
    kbd: TagGroupsKeybinding,
  },
  {
    type: 'drawer',
    key: 'tag-converters',
    icon: <IconTransform />,
    label: <Trans>Tag Converters</Trans>,
    globalStateKey: 'tagConvertersDrawerVisible',
    kbd: TagConvertersKeybinding,
  },
  {
    type: 'drawer',
    key: 'settings',
    globalStateKey: 'settingsDrawerVisible',
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
    >
      <AppShell.Navbar id="postybirb__navbar" zIndex={1000}>
        <AppShell.Section>
          <Box ta="center" p="5">
            <AppImage />
            <Divider size="md" />
          </Box>
          <Box ta="center">
            <Burger
              opened={!sideNavToggled}
              onClick={toggleSideNav}
              size="md"
            />
          </Box>
          <Box ta="center">
            <PostyBirbUpdateButton />
            <ThemePicker />
            <LanguagePicker />
          </Box>
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea} scrollbars="y">
          <Box
            ta="center"
            className={`${classes.postybirb__sidenav} ${
              sideNavToggled ? classes.collapsed : ''
            }`}
          >
            <SideNavLink
              key="search"
              label={<Trans>Search</Trans>}
              type="custom"
              onClick={() => spotlight.toggle()}
              icon={<IconSearch />}
              kbd="Ctrl+K"
              collapsed={sideNavToggled}
            />
            {navigationTargets.map((target) => {
              const { key, ...rest } = target;
              return (
                <SideNavLink key={key} {...rest} collapsed={sideNavToggled} />
              );
            })}
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <Box id="postybirb__main" className={classes.postybirb__layout}>
          <PostybirbSpotlight />
          <AccountDrawer />
          <SettingsDrawer />
          <TagGroupDrawer />
          <TagConverterDrawer />
          <Box className="postybirb__content" p="md">
            <Outlet />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
