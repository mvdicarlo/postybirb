/**
 * Navigation configuration for the PostyBirb layout.
 * Defines the main sidenav items matching the original layout.
 */

import { Trans } from '@lingui/react/macro';
import {
    IconBell,
    IconBlockquote,
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
 * Route paths for the application.
 */
export const RoutePaths = {
  Home: '/',
  FileSubmissions: '/file-submissions',
  MessageSubmissions: '/message-submissions',
} as const;

/**
 * Main navigation items displayed in the side navigation.
 * Matches the navigationTargets from the original postybirb-layout.
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

  // Main navigation links
  {
    type: 'link',
    id: 'home',
    icon: <IconHome size={20} />,
    label: <Trans>Home</Trans>,
    path: RoutePaths.Home,
    kbd: HomeKeybinding,
  },
  {
    type: 'link',
    id: 'file-submissions',
    icon: <IconFile size={20} />,
    label: <Trans>Post Files</Trans>,
    path: RoutePaths.FileSubmissions,
    kbd: FileSubmissionsKeybinding,
  },
  {
    type: 'link',
    id: 'message-submissions',
    icon: <IconMessage size={20} />,
    label: <Trans>Send Messages</Trans>,
    path: RoutePaths.MessageSubmissions,
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
    drawerKey: 'notificationsDrawerVisible',
    kbd: NotificationsKeybinding,
  },
  {
    type: 'drawer',
    id: 'accounts',
    icon: <IconUser size={20} />,
    label: <Trans>Accounts</Trans>,
    drawerKey: 'accountDrawerVisible',
    kbd: AccountKeybinding,
  },
  {
    type: 'drawer',
    id: 'tag-groups',
    icon: <IconTags size={20} />,
    label: <Trans>Tag Groups</Trans>,
    drawerKey: 'tagGroupsDrawerVisible',
    kbd: TagGroupsKeybinding,
  },
  {
    type: 'drawer',
    id: 'tag-converters',
    icon: <IconTransform size={20} />,
    label: <Trans>Tag Converters</Trans>,
    drawerKey: 'tagConvertersDrawerVisible',
    kbd: TagConvertersKeybinding,
  },
  {
    type: 'drawer',
    id: 'user-converters',
    icon: <IconUsers size={20} />,
    label: <Trans>User Converters</Trans>,
    drawerKey: 'userConvertersDrawerVisible',
    kbd: UserConvertersKeybinding,
  },
  {
    type: 'drawer',
    id: 'custom-shortcuts',
    icon: <IconBlockquote size={20} />,
    label: <Trans>Custom Shortcuts</Trans>,
    drawerKey: 'customShortcutsDrawerVisible',
    kbd: CustomShortcutsKeybinding,
  },
  {
    type: 'drawer',
    id: 'settings',
    icon: <IconSettings size={20} />,
    label: <Trans>Settings</Trans>,
    drawerKey: 'settingsDrawerVisible',
    kbd: SettingsKeybinding,
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
