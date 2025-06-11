/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/macro';
import {
  ActionIcon,
  AppShell,
  Box,
  Divider,
  Group,
  Indicator,
  ScrollArea,
  Transition,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import {
  IconArrowBarLeft,
  IconArrowBarRight,
  IconArrowUp,
  IconBell,
  IconFile,
  IconHome,
  IconMessage,
  IconSearch,
  IconSettings,
  IconTags,
  IconTransform,
  IconUser,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { RouteErrorBoundary } from '../../components/error-boundary/specialized-error-boundaries';
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
  SpotlightKeybinding,
  TagConvertersKeybinding,
  TagGroupsKeybinding,
} from '../../shared/app-keybindings';
import { NotificationStore } from '../../stores/notification.store';
import { useStore } from '../../stores/use-store';
import { AccountDrawer } from './drawers/account-drawer/account-drawer';
import { NotificationsDrawer } from './drawers/notifications-drawer';
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

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Find the main scrollable container
    const mainContent = document.querySelector('#postybirb__main');

    const handleScroll = () => {
      if (mainContent) {
        const scrollTop = mainContent.scrollTop || 0;
        setVisible(scrollTop > 200);
      }
    };

    // Add event listener to the container
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
    }

    // Cleanup
    return () => {
      if (mainContent) {
        mainContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    const mainContent = document.querySelector('#postybirb__main');
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <Transition transition="slide-up" mounted={visible}>
      {(transitionStyles) => (
        <ActionIcon
          size="lg"
          style={{
            ...transitionStyles,
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 99,
          }}
          onClick={scrollToTop}
          variant="filled"
          radius="xl"
          aria-label="Scroll to top"
        >
          <IconArrowUp size={16} />
        </ActionIcon>
      )}
    </Transition>
  );
}

function View() {
  const location = useLocation();
  
  return (
    <Box
      className={`postybirb__content ${classes.contentContainer}`}
      px="md"
      pb="sm"
    >
      <RouteErrorBoundary routeKey={location.pathname}>
        <Outlet />
      </RouteErrorBoundary>
    </Box>
  );
}

function Layout() {
  return (
    <Box id="postybirb__main" className={classes.postybirb__layout}>
      <PostybirbSpotlight />
      <AccountDrawer />
      <SettingsDrawer />
      <TagGroupDrawer />
      <TagConverterDrawer />
      <NotificationsDrawer />
      <ScrollToTop />
      <View />
    </Box>
  );
}

export function PostyBirbLayout() {
  const [sideNavToggled, { toggle: toggleSideNav }] = useDisclosure(true);
  const { colorScheme } = useMantineColorScheme();
  const { state: notifications } = useStore(NotificationStore);
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
          type="always"
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
              kbd={SpotlightKeybinding}
              collapsed={sideNavToggled}
            />
            <SideNavLink
              key="notifications"
              label={<Trans>Notifications</Trans>}
              type="drawer"
              globalStateKey="notificationsDrawerVisible"
              icon={
                <>
                  <IconBell />
                  {notifications.filter((n) => !n.isRead).length ? (
                    <Indicator
                      inline
                      color="red"
                      size={6}
                      style={{ marginBottom: '1rem' }}
                    />
                  ) : null}
                </>
              }
              kbd="Alt+N"
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
        <Layout />
      </AppShell.Main>
    </AppShell>
  );
}
