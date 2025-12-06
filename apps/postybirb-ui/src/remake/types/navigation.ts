/**
 * Navigation-related type definitions for the remake layout.
 * @module remake/types/navigation
 */

import type { ComponentType, ReactNode } from 'react';

/**
 * Represents a single item in the side navigation.
 */
export interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string;

  /** Display label shown when sidenav is expanded */
  label: string;

  /** Icon component to display (always visible, even when collapsed) */
  icon: ComponentType<{ size?: number | string }>;

  /** Route path this item navigates to */
  path: string;

  /** Optional badge content (e.g., unread count) */
  badge?: string | number;

  /** Whether this item is disabled */
  disabled?: boolean;
}

/**
 * Represents an item in the contextual sub-navigation bar.
 */
export interface SubNavItem {
  /** Unique identifier */
  id: string;

  /** Display label */
  label: string;

  /** Optional icon */
  icon?: ComponentType<{ size?: number | string }>;

  /** Click handler (mutually exclusive with path) */
  onClick?: () => void;

  /** Route path (mutually exclusive with onClick) */
  path?: string;

  /** Whether this item is currently active */
  active?: boolean;

  /** Whether this item is disabled */
  disabled?: boolean;
}

/**
 * Configuration for the sub-navigation bar.
 */
export interface SubNavConfig {
  /** Items to display in the sub-navigation bar */
  items: SubNavItem[];

  /** Whether to show the sub-nav bar */
  visible: boolean;
}

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

/**
 * Props for the RemakeI18nProvider component.
 */
export interface RemakeI18nProviderProps {
  /** Child components to wrap with i18n context */
  children: ReactNode;

  /** Locale code (e.g., 'en', 'de', 'es') - defaults to 'en' */
  locale?: string;
}

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
 * Props for the SubNavBar component.
 */
export interface SubNavBarProps {
  /** Configuration for sub-nav content */
  config: SubNavConfig;
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
