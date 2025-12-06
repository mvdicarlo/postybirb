# Research: Mantine UI Layout Foundation

**Feature**: 002-mantine-ui-layout  
**Date**: December 6, 2025

## Technical Decisions

### Decision 1: Mantine v8 Migration

**Decision**: Upgrade from Mantine v7.17.4 to Mantine v8.x (latest stable)

**Rationale**:
- User explicitly requested using the latest version of Mantine (v8)
- Mantine v8 includes performance improvements and new features
- Better to start fresh in `/remake` with v8 than migrate later

**Migration Impact** (from v7 to v8):
- Global styles imports unchanged if using `@mantine/core/styles.css`
- Portal `reuseTargetNode` now enabled by default (may need to disable if z-index issues)
- Switch component has new `withThumbIndicator` style
- `@mantine/dates` components now use string values in onChange (not Date objects)
- Menu.Item no longer uses `data-hovered` (use `:hover` and `:focus` instead)
- Popover `hideDetached` now enabled by default

**Alternatives Considered**:
- Stay on Mantine v7: Rejected because user explicitly requested v8

### Decision 2: Layout Architecture - Custom Layout (No AppShell)

**Decision**: Build a custom layout from scratch using Mantine's basic components (Box, Stack, Group, NavLink) instead of the AppShell component

**Rationale**:
- User explicitly requested not to use AppShell
- Custom layout provides more control over positioning and behavior
- Allows for a more tailored email-client-style layout
- Can still leverage Mantine's NavLink and other navigation components

**Implementation Approach**:
- Use CSS Flexbox with Mantine's `Box` component for the overall structure
- Fixed-position sidenav on the left
- Main content area that adjusts based on sidenav state
- Use `NavLink` components from Mantine for navigation items
- Custom CSS for transitions and collapsed states

**Layout Structure**:
```
+------------------+----------------------------------------+
|                  |  SubNavBar (horizontal, scrollable)   |
|    SideNav       +----------------------------------------+
|   (collapsible)  |  ContentNavbar (pagination, actions)  |
|                  +----------------------------------------+
|                  |                                        |
|                  |         Primary Content Area           |
|                  |           (scrollable)                 |
|                  |                                        |
+------------------+----------------------------------------+
```

**Alternatives Considered**:
- Mantine AppShell: Rejected per user request for more control

### Decision 3: Internationalization with Lingui

**Decision**: Implement translation support using Lingui, based on the existing `app-i18n-provider.tsx` pattern but with a cleaner implementation

**Rationale**:
- Constitution requires internationalization support (Principle VI)
- Existing codebase uses Lingui for translations
- Consistent approach across the application

**Implementation Approach**:
- Create `RemakeI18nProvider` component in remake directory
- Use dynamic imports for language files (same pattern as existing)
- Wrap RemakeApp with the i18n provider
- Use `@lingui/macro` for translatable strings (`Trans`, `t`, `msg`)
- Support locale from settings (via hook or context)

**Key Dependencies**:
- `@lingui/core` - Core i18n functionality
- `@lingui/react` - React integration (I18nProvider, Trans)
- `@lingui/macro` - Compile-time macros for translations
- `@mantine/dates` DatesProvider for date localization

**Pattern from existing code** (simplified for remake):
```tsx
// RemakeI18nProvider.tsx
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';

export function RemakeI18nProvider({ children, locale }) {
  useEffect(() => {
    loadLocale(locale);
  }, [locale]);
  
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
```

**Alternatives Considered**:
- react-i18next: Rejected because project already uses Lingui
- No i18n in remake: Rejected per constitution requirements

### Decision 4: Sub-Navigation Bar Implementation

**Decision**: Implement sub-navigation as a horizontal bar at the top of the main content area

**Rationale**:
- Clear separation between main nav (sidenav) and contextual nav (sub-nav)
- Horizontal scrolling for overflow items using Mantine's `ScrollArea`
- Content changes based on current route/section

**Implementation Approach**:
- Create a `SubNavBar` component using Mantine `Group` and `ScrollArea`
- Fixed height, positioned at top of content area
- Items passed via props based on current route
- Active state highlighting for current sub-nav item

**Alternatives Considered**:
- Tabs component: Could work but sub-nav may have more complex items
- Vertical sub-nav: Rejected to maximize horizontal content space

### Decision 5: Content Navbar with Pagination

**Decision**: Create a dedicated `ContentNavbar` component with pagination controls

**Rationale**:
- Separates concerns: sub-nav for section navigation, content navbar for pagination/actions
- Uses Mantine's `Pagination` component
- Follows email-client pattern (folder list → message list navbar → messages)

**Implementation Approach**:
- `ContentNavbar` component using Mantine `Group` for layout
- Left slot: title/info, Center: pagination, Right: actions
- Mantine `Pagination` component for page controls
- Fixed height, sticky positioning below sub-nav

**Alternatives Considered**:
- Combine sub-nav and pagination: Rejected because they serve different purposes

### Decision 6: State Management for Sidenav Collapse

**Decision**: Use React state with localStorage persistence via Mantine's `useLocalStorage` hook

**Rationale**:
- Simple React state is sufficient for this isolated UI state
- Mantine provides `useLocalStorage` hook that handles serialization
- Persists across sessions (localStorage instead of sessionStorage for better UX)

**Implementation Approach**:
- Use `@mantine/hooks` `useLocalStorage` with key `remake-sidenav-collapsed`
- Store boolean value for collapsed state
- Initialize from storage on mount, update storage on change

**Alternatives Considered**:
- Global state (Zustand/Redux): Overkill for sidenav collapse state
- sessionStorage: Rejected in favor of localStorage for persistence across sessions

### Decision 7: Routing with React Router

**Decision**: Use React Router DOM (already a dependency at v6.17.0)

**Rationale**:
- Already installed in the project
- React Router v6 has modern API with hooks
- Supports nested routes which aligns with our layout structure
- `Outlet` component perfect for rendering child routes in content area

**Implementation Approach**:
- Create `RemakeApp` component with React Router setup
- Use `Outlet` in the layout for dynamic content rendering
- Navigation items link to routes
- Route definitions determine which sub-nav content to show

**Alternatives Considered**:
- TanStack Router: Not installed, would add dependency
- Wouter: Lighter but React Router already available

### Decision 8: Project Structure in /remake Directory

**Decision**: Self-contained module structure within `apps/postybirb-ui/src/remake/`

**Rationale**:
- User explicitly requested all remake code in `/remake` directory
- No references to existing code outside `/remake`
- Clean separation allows parallel development
- Can gradually migrate or integrate later

**Directory Structure**:
```
apps/postybirb-ui/src/remake/
├── index.tsx                    # Entry point (RemakeApp)
├── providers/
│   └── remake-i18n-provider.tsx # Lingui i18n setup
├── components/
│   ├── layout/
│   │   ├── layout.tsx           # Main layout container (custom, no AppShell)
│   │   ├── side-nav.tsx         # Side navigation component
│   │   ├── nav-item.tsx         # Individual nav item using NavLink
│   │   ├── sub-nav-bar.tsx      # Horizontal sub-navigation
│   │   ├── content-navbar.tsx   # Content area navbar with pagination
│   │   └── content-area.tsx     # Scrollable content container
│   └── shared/
│       └── ... (future shared components)
├── routes/
│   ├── index.tsx                # Route definitions
│   └── pages/
│       ├── home/                # Example section 1
│       ├── submissions/         # Example section 2
│       └── settings/            # Example section 3
├── hooks/
│   └── use-sidenav.ts           # Sidenav collapse state hook
├── styles/
│   └── layout.css               # Layout-specific styles
└── types/
    └── navigation.ts            # Navigation-related types
```

**Alternatives Considered**:
- Integrate with existing structure: Rejected per user requirement
- Separate library: Overkill for this feature scope

## Dependencies to Add/Update

| Package | Current Version | Target Version | Notes |
|---------|----------------|----------------|-------|
| @mantine/core | ^7.17.4 | ^8.x | Major upgrade |
| @mantine/hooks | ^7.17.4 | ^8.x | Major upgrade |
| @mantine/dates | ^7.17.4 | ^8.x | Major upgrade |
| @mantine/dropzone | ^7.17.4 | ^8.x | Major upgrade (if used) |
| @mantine/form | ^7.17.4 | ^8.x | Major upgrade (if used) |
| @mantine/notifications | ^7.17.4 | ^8.x | Major upgrade (if used) |
| @mantine/spotlight | ^7.17.4 | ^8.x | Major upgrade (if used) |
| @blocknote/mantine | ^0.44.0 | Check compatibility | May need update for Mantine v8 |

**Already Available** (no changes needed):
- @lingui/core, @lingui/react, @lingui/macro - Already installed
- react-router, react-router-dom - Already at v6.17.0
- @tabler/icons-react - Already installed

## Open Questions (Resolved)

1. **How should the remake entry point integrate with the existing app?**
   - **Resolution**: For now, create as standalone. Integration path TBD in future feature.

2. **Should we support mobile responsive breakpoints?**
   - **Resolution**: Per spec, target desktop viewports (1024px+) initially. Sidenav collapses manually; auto-collapse on resize is future scope.

3. **What navigation items should be shown in the demo?**
   - **Resolution**: Create 3 placeholder sections (Home, Submissions, Settings) to demonstrate navigation working per SC-001.

4. **How to handle locale selection?**
   - **Resolution**: For now, default to 'en'. Future: read from settings store or provide locale prop.
