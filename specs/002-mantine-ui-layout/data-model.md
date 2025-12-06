# Data Model: Mantine UI Layout Foundation

**Feature**: 002-mantine-ui-layout  
**Date**: December 6, 2025

## Overview

This feature primarily deals with UI layout structure rather than persistent data. The "data model" for this feature consists of TypeScript interfaces that define the shape of navigation configuration, layout state, and component props.

## Entities

### NavigationItem

Represents a single item in the side navigation.

```typescript
interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string;
  
  /** Display label shown when sidenav is expanded */
  label: string;
  
  /** Icon component to display (always visible, even when collapsed) */
  icon: React.ComponentType<{ size?: number | string }>;
  
  /** Route path this item navigates to */
  path: string;
  
  /** Optional badge content (e.g., count) */
  badge?: string | number;
  
  /** Whether this item is disabled */
  disabled?: boolean;
}
```

**Validation Rules**:
- `id` must be unique across all navigation items
- `path` must be a valid route path starting with `/`
- `label` must not be empty

### SubNavItem

Represents an item in the contextual sub-navigation bar.

```typescript
interface SubNavItem {
  /** Unique identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Optional icon */
  icon?: React.ComponentType<{ size?: number | string }>;
  
  /** Click handler or route path */
  onClick?: () => void;
  path?: string;
  
  /** Whether this item is currently active */
  active?: boolean;
  
  /** Whether this item is disabled */
  disabled?: boolean;
}
```

**Validation Rules**:
- Must have either `onClick` or `path`, not both
- `id` must be unique within the sub-navigation context

### PaginationState

Represents the current pagination state for the content area.

```typescript
interface PaginationState {
  /** Current page number (1-indexed) */
  currentPage: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Optional: items per page */
  itemsPerPage?: number;
  
  /** Optional: total item count */
  totalItems?: number;
}
```

**Validation Rules**:
- `currentPage` must be >= 1 and <= `totalPages`
- `totalPages` must be >= 1
- `itemsPerPage` if provided, must be > 0

### SideNavState

Represents the collapse/expand state of the side navigation.

```typescript
interface SideNavState {
  /** Whether the sidenav is collapsed */
  collapsed: boolean;
}
```

**State Transitions**:
- collapsed: false → true (user clicks collapse button)
- collapsed: true → false (user clicks expand button)
- State persists in localStorage across browser sessions

### SubNavConfig

Configuration for the sub-navigation bar per section.

```typescript
interface SubNavConfig {
  /** Items to display in the sub-navigation bar */
  items: SubNavItem[];
  
  /** Whether to show the sub-nav bar (hide if empty) */
  visible: boolean;
}
```

### ContentNavbarConfig

Configuration for the content navbar.

```typescript
interface ContentNavbarConfig {
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

## Relationships

```
NavigationItem[] ─────> SideNav (displays list of items)
         │
         │ (route change)
         ▼
SubNavConfig ─────────> SubNavBar (displays contextual items)
         │
         │ (content context)
         ▼
ContentNavbarConfig ──> ContentNavbar (displays pagination + actions)
         │
         │ (controls)
         ▼
PrimaryContentArea ───> Renders child routes via <Outlet />
```

## State Persistence

| State | Storage | Scope | Key |
|-------|---------|-------|-----|
| SideNavState.collapsed | localStorage | Persistent | `remake-sidenav-collapsed` |
| Current route | URL | Browser history | N/A (managed by React Router) |
| PaginationState | React state (lifted) | Component lifecycle | N/A (passed via props) |
| Locale | Settings/Props | Application | N/A (passed to RemakeI18nProvider) |

## Component Props Summary

### RemakeI18nProvider Props
```typescript
interface RemakeI18nProviderProps {
  /** Child components to wrap with i18n context */
  children: React.ReactNode;
  
  /** Locale code (e.g., 'en', 'de', 'es') - defaults to 'en' */
  locale?: string;
}
```

### Layout Props
```typescript
interface LayoutProps {
  /** Children rendered in the main content area (typically <Outlet />) */
  children: React.ReactNode;
}
```

### SideNav Props
```typescript
interface SideNavProps {
  /** Navigation items to display */
  items: NavigationItem[];
  
  /** Currently active item id */
  activeId?: string;
  
  /** Whether sidenav is collapsed */
  collapsed: boolean;
  
  /** Callback when collapse state changes */
  onCollapsedChange: (collapsed: boolean) => void;
}
```

### SubNavBar Props
```typescript
interface SubNavBarProps {
  /** Configuration for sub-nav content */
  config: SubNavConfig;
}
```

### ContentNavbar Props
```typescript
interface ContentNavbarProps {
  /** Configuration for navbar content */
  config: ContentNavbarConfig;
  
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
}
```

### ContentArea Props
```typescript
interface ContentAreaProps {
  /** Content to render */
  children: React.ReactNode;
  
  /** Optional loading state */
  loading?: boolean;
}
```
