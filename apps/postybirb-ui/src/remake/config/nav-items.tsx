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
  IconHome,
  IconMessage,
  IconSearch,
  IconSettings,
  IconTags,
  IconTransform,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import type { NavigationItem, SubNavConfig } from '../types/navigation';
import {
  createFileSubmissionsViewState,
  createMessageSubmissionsViewState,
  defaultViewState,
} from '../types/view-state';
import { openUrl } from '../utils';
import {
  AccountKeybinding,
  CustomShortcutsKeybinding,
  FileSubmissionsKeybinding,
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
    id: 'accounts',
    icon: <IconUser size={20} />,
    label: <Trans>Accounts</Trans>,
    drawerKey: 'accounts',
    kbd: AccountKeybinding,
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
      openUrl('https://ko-fi.com/A81124JD')
    },
  },
];

/**
 * Sub-navigation configurations per section.
 * Used to provide contextual sub-nav items based on the current route.
 */
/* eslint-disable lingui/no-unlocalized-strings */
export const subNavConfigs: Record<string, SubNavConfig> = {
  home: {
    visible: false,
    items: [],
  },
  'file-submissions': {
    visible: true,
    items: [
      { id: 'all', label: 'All', active: true },
      { id: 'drafts', label: 'Drafts' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'posted', label: 'Posted' },
      { id: 'failed', label: 'Failed' },
    ],
  },
  'message-submissions': {
    visible: true,
    items: [
      { id: 'all', label: 'All', active: true },
      { id: 'drafts', label: 'Drafts' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'posted', label: 'Posted' },
      { id: 'failed', label: 'Failed' },
    ],
  },
};
/* eslint-enable lingui/no-unlocalized-strings */

/**
 * Get the sub-nav configuration for a given route path.
 * @param path - The current route path
 * @returns The sub-nav configuration for the route, or a default hidden config
 */
export function getSubNavConfig(path: string): SubNavConfig {
  // Normalize path to section ID
  const sectionId = path === '/' ? 'home' : path.replace(/^\//, '').split('/')[0];

  return subNavConfigs[sectionId] || { visible: false, items: [] };
}
