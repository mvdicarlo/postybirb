# Component Contracts: Mantine UI Layout Foundation

**Feature**: 002-mantine-ui-layout  
**Date**: December 6, 2025

## Overview

This document defines the TypeScript interfaces and component contracts for the layout system. Since this is a frontend feature, "contracts" are the component props and shared types that define how components interact. The layout uses custom flexbox-based structure (no AppShell) with Lingui for internationalization.

## Type Definitions

### navigation.ts

```typescript
/**
 * Represents a single item in the side navigation.
 */
export interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string;
  
  /** Display label shown when sidenav is expanded (should use Trans or t`` for i18n) */
  label: string;
  
  /** Icon component to display (always visible) */
  icon: React.ComponentType<{ size?: number | string }>;
  
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
  
  /** Display label (should use Trans or t`` for i18n) */
  label: string;
  
  /** Optional icon */
  icon?: React.ComponentType<{ size?: number | string }>;
  
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
  actions?: React.ReactNode;
}
```

## Component Contracts

### RemakeI18nProvider

**Purpose**: Wraps the application with Lingui i18n support for translations.

**Props**:
```typescript
export interface RemakeI18nProviderProps {
  /** Child components to wrap with i18n context */
  children: React.ReactNode;
  
  /** Locale code (e.g., 'en', 'de', 'es') - defaults to 'en' */
  locale?: string;
}
```

**Behavior**:
- Loads locale messages dynamically from `/lang/{locale}.po`
- Activates Lingui i18n with loaded messages
- Shows loading state while translations load
- Wraps children with LinguiI18nProvider and DatesProvider

### Layout

**Purpose**: Root layout component using custom flexbox structure (no AppShell).

**Props**:
```typescript
export interface LayoutProps {
  /** Children rendered in the main content area */
  children: React.ReactNode;
}
```

**Behavior**:
- Renders full-height flexbox container
- Fixed sidenav on left side
- Main content area fills remaining width
- Manages sidenav collapse state via useSideNav hook
- Adjusts content area width when sidenav collapses/expands

### SideNav

**Purpose**: Collapsible side navigation panel using Mantine NavLink.

**Props**:
```typescript
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
```

**Behavior**:
- In expanded state: shows icons + labels
- In collapsed state: shows icons only with tooltips on hover
- Uses Mantine NavLink for each item
- Highlights active navigation item based on current route
- Calls onCollapsedChange when toggle button clicked
- Smooth CSS transition between states

### SubNavBar

**Purpose**: Horizontal contextual navigation bar with scroll support.

**Props**:
```typescript
export interface SubNavBarProps {
  /** Configuration for sub-nav content */
  config: SubNavConfig;
}
```

**Behavior**:
- Hidden when config.visible is false
- Renders items horizontally using Mantine Group
- Uses ScrollArea for horizontal overflow
- Highlights active item if config.items[n].active is true
- Executes onClick or navigates to path on item click

### ContentNavbar

**Purpose**: Navbar at top of content area with pagination controls.

**Props**:
```typescript
export interface ContentNavbarProps {
  /** Configuration for navbar content */
  config: ContentNavbarConfig;
  
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
}
```

**Behavior**:
- Shows title if provided
- Shows Mantine Pagination component if config.showPagination is true
- Calls onPageChange when pagination controls used
- Renders config.actions in actions slot (right side)

### ContentArea

**Purpose**: Scrollable container for primary content.

**Props**:
```typescript
export interface ContentAreaProps {
  /** Content to render */
  children: React.ReactNode;
  
  /** Optional loading state */
  loading?: boolean;
}
```

**Behavior**:
- Scrolls independently of fixed layout elements
- Shows Mantine Loader overlay when loading is true
- Fills available space below ContentNavbar

## Hook Contracts

### useSideNav

**Purpose**: Manages sidenav collapse state with localStorage persistence.

**Signature**:
```typescript
export function useSideNav(): {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}
```

**Behavior**:
- Uses Mantine's useLocalStorage hook internally
- Reads initial state from localStorage (key: `remake-sidenav-collapsed`)
- Updates localStorage when state changes
- Returns current state and control functions

## CSS Variables / Layout Constants

```typescript
// Layout dimensions (can be in layout.css or as constants)
export const LAYOUT_CONSTANTS = {
  SIDENAV_WIDTH_EXPANDED: 280,     // px
  SIDENAV_WIDTH_COLLAPSED: 60,    // px
  SUBNAV_HEIGHT: 48,              // px
  CONTENT_NAVBAR_HEIGHT: 48,      // px
  TRANSITION_DURATION: 200,       // ms
};
```

## Context (Future Expansion)

### LayoutContext

**Purpose**: Provides layout state to deeply nested components (if prop drilling becomes unwieldy).

**Value**:
```typescript
export interface LayoutContextValue {
  sideNavCollapsed: boolean;
  toggleSideNav: () => void;
  locale: string;
}
```

**Note**: May not be needed for initial implementation if prop drilling is sufficient.
