/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import {
  AppShell,
  Box,
  Divider,
  Group,
  ScrollArea,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import {
  IconArrowBarLeft,
  IconArrowBarRight,
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
    <div className={classes.logoContainer}>
      <img
        src="/app-icon.png"
        alt="postybirb icon"
        className={classes.logoImage}
      />
    </div>
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
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <AppShell
      navbar={{
        width: sideNavToggled ? 60 : 240,
        breakpoint: 'sm',
      }}
      className={isDark ? classes.darkAppShell : ''}
    >
      <AppShell.Navbar id="postybirb__navbar" className={classes.navbar}>
        <AppShell.Section className={classes.navbarHeader}>
          <Box className={classes.logoWrapper}>
            <AppImage />
          </Box>
          <Divider size="md" />
        </AppShell.Section>

        <AppShell.Section
          grow
          component={ScrollArea}
          scrollbars="y"
          className={classes.navbarScroll}
        >
          <Box
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

        <AppShell.Section className={classes.navbarFooter}>
          <Box className={classes.toggleButtonContainer}>
            {sideNavToggled ? (
              <IconArrowBarRight
                className={classes.toggleIcon}
                onClick={toggleSideNav}
              />
            ) : (
              <IconArrowBarLeft
                className={classes.toggleIcon}
                onClick={toggleSideNav}
              />
            )}
          </Box>
          <Group
            gap="xs"
            className={
              sideNavToggled
                ? classes.utilityFooter
                : classes.utilityFooterExpanded
            }
          >
            <ThemePicker />
            <LanguagePicker />
            <PostyBirbUpdateButton />
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main className={classes.mainContent}>
        <Box id="postybirb__main" className={classes.postybirb__layout}>
          <PostybirbSpotlight />
          <AccountDrawer />
          <SettingsDrawer />
          <TagGroupDrawer />
          <TagConverterDrawer />
          <Box
            className={`postybirb__content ${classes.contentContainer}`}
            px="md"
            pb="sm"
          >
            <Outlet />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
