/**
 * Navigation-related type definitions for the remake layout.
 * @module remake/types/navigation
 */

import type { ReactNode } from 'react';
import type { DrawerKey } from '../stores/ui/drawer-store';
import type { ViewState } from './view-state';

// =============================================================================
// Navigation Item Types
// =============================================================================

/**
 * Base properties shared by standard navigation items (link, drawer, custom, view).
 */
interface NavigationItemBase {
  /** Unique identifier for the navigation item */
  id: string;

  /** Display label shown when sidenav is expanded */
  label: ReactNode;

  /** Icon component to display (always visible, even when collapsed) */
  icon: ReactNode;

  /** Optional keyboard shortcut */
  kbd?: string;

  /** Whether this item is disabled */
  disabled?: boolean;
}

/**
 * Navigation item that sets a view state.
 * This is the primary navigation type for state-driven navigation.
 */
export interface NavigationViewItem extends NavigationItemBase {
  type: 'view';
  /** View state to set when clicked */
  viewState: ViewState;
}

/**
 * Navigation item that links to a route (legacy/external use).
 */
export interface NavigationLinkItem extends NavigationItemBase {
  type: 'link';
  /** Route path this item navigates to */
  path: string;
}

/**
 * Navigation item that toggles a drawer.
 */
export interface NavigationDrawerItem extends NavigationItemBase {
  type: 'drawer';
  /** Key in the global drawer state to toggle */
  drawerKey: DrawerKey;
}

/**
 * Navigation item with custom click behavior.
 */
export interface NavigationCustomItem extends NavigationItemBase {
  type: 'custom';
  /** Click handler */
  onClick: () => void;
}

/**
 * Base for special navigation items (no label/icon - handled internally).
 */
interface NavigationSpecialItemBase {
  /** Unique identifier */
  id: string;
  /** Optional keyboard shortcut */
  kbd?: string;
}

/**
 * Navigation item for theme toggle.
 * Icon and label are handled dynamically based on current theme.
 */
export interface NavigationThemeItem extends NavigationSpecialItemBase {
  type: 'theme';
}

/**
 * Navigation item for language picker.
 * Icon and label are handled dynamically based on current locale.
 */
export interface NavigationLanguageItem extends NavigationSpecialItemBase {
  type: 'language';
}

/**
 * Represents a divider in the navigation list.
 */
export interface NavigationDivider {
  type: 'divider';
  id: string;
}

/**
 * Union type for all navigation item types.
 */
export type NavigationItem =
  | NavigationViewItem
  | NavigationLinkItem
  | NavigationDrawerItem
  | NavigationCustomItem
  | NavigationThemeItem
  | NavigationLanguageItem
  | NavigationDivider;

/**
 * Type guard to check if a navigation item has standard properties (label, icon).
 */
export function isStandardNavItem(
  item: NavigationItem
): item is NavigationViewItem | NavigationLinkItem | NavigationDrawerItem | NavigationCustomItem {
  return item.type === 'view' || item.type === 'link' || item.type === 'drawer' || item.type === 'custom';
}

/**
 * Type guard to check if a navigation item is a view state item.
 */
export function isViewNavItem(
  item: NavigationItem
): item is NavigationViewItem {
  return item.type === 'view';
}

/**
 * Type guard to check if a navigation item is a special item (theme, language).
 */
export function isSpecialNavItem(
  item: NavigationItem
): item is NavigationThemeItem | NavigationLanguageItem {
  return item.type === 'theme' || item.type === 'language';
}

// =============================================================================
// Sub-Navigation Types
// =============================================================================

// =============================================================================
// Content & Pagination Types
// =============================================================================

/**
 * Pagination state for content area.
 */
export interface PaginationState {
  /** Current page number (1-indexed) */
  currentPage: number;

  /** Total number of pages */
  totalPages: number;

  /** Optional: items per page */
  itemsPerPage?: number;

  /** Optional: total item count */
  totalItems?: number;
}

/**
 * Configuration for the content navbar.
 */
export interface ContentNavbarConfig {
  /** Whether to show pagination controls */
  showPagination: boolean;

  /** Pagination state (required if showPagination is true) */
  pagination?: PaginationState;

  /** Optional title to display in navbar */
  title?: string;

  /** Optional actions to render in the navbar */
  actions?: ReactNode;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for the Layout component.
 */
export interface LayoutProps {
  /** Children rendered in the main content area (typically <Outlet />) */
  children: ReactNode;
}

/**
 * Props for the SideNav component.
 */
export interface SideNavProps {
  /** Navigation items to display */
  items: NavigationItem[];

  /** Currently active item id (optional, auto-detected from route if not provided) */
  activeId?: string;

  /** Whether sidenav is collapsed */
  collapsed: boolean;

  /** Callback when collapse state changes */
  onCollapsedChange: (collapsed: boolean) => void;
}

/**
 * Props for the ContentNavbar component.
 */
export interface ContentNavbarProps {
  /** Configuration for navbar content */
  config: ContentNavbarConfig;

  /** Callback when page changes */
  onPageChange?: (page: number) => void;
}

/**
 * Props for the ContentArea component.
 */
export interface ContentAreaProps {
  /** Content to render */
  children: ReactNode;

  /** Optional loading state */
  loading?: boolean;
}

// =============================================================================
// Layout Constants
// =============================================================================

/**
 * Layout dimensions and constants.
 */
export const LAYOUT_CONSTANTS = {
  SIDENAV_WIDTH_EXPANDED: 280,
  SIDENAV_WIDTH_COLLAPSED: 60,
  SUBNAV_HEIGHT: 48,
  CONTENT_NAVBAR_HEIGHT: 48,
  TRANSITION_DURATION: 200,
} as const;
