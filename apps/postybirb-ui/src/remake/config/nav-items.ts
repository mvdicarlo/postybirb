/**
 * Navigation configuration for the PostyBirb layout.
 * Defines the main sidenav items with 3 demo sections.
 */

/* eslint-disable lingui/no-unlocalized-strings */
import {
    IconHome,
    IconSend,
    IconSettings,
} from '@tabler/icons-react';
import type { NavigationItem, SubNavConfig } from '../types/navigation';

/**
 * Main navigation items displayed in the side navigation.
 */
export const navItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: IconHome,
    path: '/',
  },
  {
    id: 'submissions',
    label: 'Submissions',
    icon: IconSend,
    path: '/submissions',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: IconSettings,
    path: '/settings',
  },
];

/**
 * Sub-navigation configurations per section.
 * Used to provide contextual sub-nav items based on the current route.
 */
export const subNavConfigs: Record<string, SubNavConfig> = {
  home: {
    visible: true,
    items: [
      { id: 'overview', label: 'Overview', active: true },
      { id: 'recent', label: 'Recent Activity' },
      { id: 'notifications', label: 'Notifications' },
    ],
  },
  submissions: {
    visible: true,
    items: [
      { id: 'all', label: 'All', active: true },
      { id: 'drafts', label: 'Drafts' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'posted', label: 'Posted' },
      { id: 'failed', label: 'Failed' },
    ],
  },
  settings: {
    visible: true,
    items: [
      { id: 'general', label: 'General', active: true },
      { id: 'accounts', label: 'Accounts' },
      { id: 'preferences', label: 'Preferences' },
      { id: 'about', label: 'About' },
    ],
  },
};

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
