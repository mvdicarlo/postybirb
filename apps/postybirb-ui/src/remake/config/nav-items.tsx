/**
 * Navigation configuration for the PostyBirb layout.
 * Defines the main sidenav items using state-driven navigation.
 */

import { Trans } from '@lingui/react/macro';
import {
  IconBell,
  IconBlockquote,
  IconBrandDiscord,
  IconCoffee,
  IconFile,
  IconFolderSearch,
  IconHome,
  IconMessage,
  IconSearch,
  IconSettings,
  IconTags,
  IconTransform,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import type { NavigationItem } from '../types/navigation';
import {
  createAccountsViewState,
  createFileSubmissionsViewState,
  createMessageSubmissionsViewState,
  defaultViewState,
} from '../types/view-state';
import { openUrl } from '../utils';
import {
  AccountKeybinding,
  CustomShortcutsKeybinding,
  FileSubmissionsKeybinding,
  FileWatchersKeybinding,
  HomeKeybinding,
  MessageSubmissionsKeybinding,
  NotificationsKeybinding,
  SettingsKeybinding,
  SpotlightKeybinding,
  TagConvertersKeybinding,
  TagGroupsKeybinding,
  UserConvertersKeybinding,
} from './keybindings';

/**
 * Main navigation items displayed in the side navigation.
 * Uses view state navigation for primary sections.
 */
export const navItems: NavigationItem[] = [
  // Search (spotlight) - custom action
  {
    type: 'custom',
    id: 'search',
    icon: <IconSearch size={20} />,
    label: <Trans>Search</Trans>,
    kbd: SpotlightKeybinding,
    onClick: () => {
      // Spotlight will be implemented separately
      // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
      console.log('Spotlight toggle');
    },
  },

  // Main navigation - view state items
  {
    type: 'view',
    id: 'home',
    icon: <IconHome size={20} />,
    label: <Trans>Home</Trans>,
    viewState: defaultViewState,
    kbd: HomeKeybinding,
  },
  {
    type: 'view',
    id: 'accounts',
    icon: <IconUser size={20} />,
    label: <Trans>Accounts</Trans>,
    viewState: createAccountsViewState(),
    kbd: AccountKeybinding,
  },
  {
    type: 'view',
    id: 'file-submissions',
    icon: <IconFile size={20} />,
    label: <Trans>Post Files</Trans>,
    viewState: createFileSubmissionsViewState(),
    kbd: FileSubmissionsKeybinding,
  },
  {
    type: 'view',
    id: 'message-submissions',
    icon: <IconMessage size={20} />,
    label: <Trans>Send Messages</Trans>,
    viewState: createMessageSubmissionsViewState(),
    kbd: MessageSubmissionsKeybinding,
  },

  // Divider
  { type: 'divider', id: 'divider-1' },

  // Drawer items
  {
    type: 'drawer',
    id: 'notifications',
    icon: <IconBell size={20} />,
    label: <Trans>Notifications</Trans>,
    drawerKey: 'notifications',
    kbd: NotificationsKeybinding,
  },
  {
    type: 'drawer',
    id: 'tag-groups',
    icon: <IconTags size={20} />,
    label: <Trans>Tag Groups</Trans>,
    drawerKey: 'tagGroups',
    kbd: TagGroupsKeybinding,
  },
  {
    type: 'drawer',
    id: 'tag-converters',
    icon: <IconTransform size={20} />,
    label: <Trans>Tag Converters</Trans>,
    drawerKey: 'tagConverters',
    kbd: TagConvertersKeybinding,
  },
  {
    type: 'drawer',
    id: 'user-converters',
    icon: <IconUsers size={20} />,
    label: <Trans>User Converters</Trans>,
    drawerKey: 'userConverters',
    kbd: UserConvertersKeybinding,
  },
  {
    type: 'drawer',
    id: 'custom-shortcuts',
    icon: <IconBlockquote size={20} />,
    label: <Trans>Custom Shortcuts</Trans>,
    drawerKey: 'customShortcuts',
    kbd: CustomShortcutsKeybinding,
  },
  {
    type: 'drawer',
    id: 'file-watchers',
    icon: <IconFolderSearch size={20} />,
    label: <Trans>File Watchers</Trans>,
    drawerKey: 'fileWatchers',
    kbd: FileWatchersKeybinding,
  },
  {
    type: 'drawer',
    id: 'settings',
    icon: <IconSettings size={20} />,
    label: <Trans>Settings</Trans>,
    drawerKey: 'settings',
    kbd: SettingsKeybinding,
  },

  // Divider before external links
  { type: 'divider', id: 'divider-2' },

  // Theme toggle
  {
    type: 'theme',
    id: 'theme-toggle',
  },

  // Language picker
  {
    type: 'language',
    id: 'language-picker',
  },

  // Divider before external links
  { type: 'divider', id: 'divider-3' },

  // Discord
  {
    type: 'custom',
    id: 'discord',
    icon: <IconBrandDiscord size={20} />,
    label: <Trans>Discord</Trans>,
    onClick: () => {
      openUrl('https://discord.gg/8ZqF4HXy89');
    },
  },

  // Ko-fi
  {
    type: 'custom',
    id: 'kofi',
    icon: <IconCoffee size={20} />,
    label: <Trans>Ko-fi</Trans>,
    onClick: () => {
      openUrl('https://ko-fi.com/A81124JD');
    },
  },
];
