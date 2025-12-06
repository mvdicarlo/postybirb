# Implementation Plan: Mantine UI Layout Foundation

**Branch**: `002-mantine-ui-layout` | **Date**: December 6, 2025 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-mantine-ui-layout/spec.md`

## Summary

Create a foundational email-client-style layout using Mantine v8 components (custom layout, no AppShell), featuring a collapsible side navigation, contextual sub-navigation bar, content navbar with pagination, and primary content area. The implementation includes Lingui i18n support and will be self-contained in the `/remake` directory using React Router for navigation.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x  
**Primary Dependencies**: Mantine v8 (upgrade from v7), React Router DOM v6.17.0, @tabler/icons-react, Lingui (i18n)  
**Storage**: localStorage (sidenav collapse state)  
**Testing**: Jest (existing project configuration)  
**Target Platform**: Electron desktop app, web browser (1024px+ viewports)  
**Project Type**: Web application (frontend only for this feature)  
**Performance Goals**: Navigation < 2 seconds, sub-nav update < 500ms  
**Constraints**: Desktop-first (1024px+ minimum), no references to existing UI code, custom layout (no AppShell)  
**Scale/Scope**: 3 demo sections, foundation for future feature development

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Modular Monorepo Architecture | ✅ PASS | Code in `apps/postybirb-ui/src/remake/` follows Nx structure |
| II. Website Plugin Pattern | ✅ N/A | Not a website integration |
| III. Type Safety First | ✅ PASS | All components use TypeScript interfaces |
| IV. Testing Discipline | ⚠️ DEFERRED | Basic tests to be added; focus on layout structure first |
| V. Conventional Commits | ✅ PASS | Will follow commit conventions |
| VI. Internationalization Ready | ✅ PASS | Lingui i18n support included via RemakeI18nProvider |

**Pre-Design Gate**: PASS (with noted deferrals)  
**Post-Design Re-check**: PASS - design aligns with architecture principles

## Project Structure

### Documentation (this feature)

```text
specs/002-mantine-ui-layout/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Technology decisions and research
├── data-model.md        # TypeScript interfaces and data shapes
├── quickstart.md        # Developer quickstart guide
├── contracts/           # Component contracts
│   └── component-contracts.md
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
apps/postybirb-ui/src/remake/
├── index.tsx                    # RemakeApp entry point with providers + Router
├── providers/
│   └── remake-i18n-provider.tsx # Lingui i18n setup (based on app-i18n-provider pattern)
├── components/
│   └── layout/
│       ├── layout.tsx           # Main custom layout (flexbox, no AppShell)
│       ├── side-nav.tsx         # Collapsible side navigation
│       ├── nav-item.tsx         # Individual navigation item using NavLink
│       ├── sub-nav-bar.tsx      # Horizontal sub-navigation bar
│       ├── content-navbar.tsx   # Content area navbar with pagination
│       └── content-area.tsx     # Scrollable primary content container
├── routes/
│   ├── index.tsx                # Route definitions and configuration
│   └── pages/
│       ├── home/
│       │   └── home-page.tsx    # Demo section 1
│       ├── submissions/
│       │   └── submissions-page.tsx  # Demo section 2
│       └── settings/
│           └── settings-page.tsx # Demo section 3
├── hooks/
│   └── use-sidenav.ts           # Sidenav collapse state with localStorage persistence
├── styles/
│   └── layout.css               # Layout-specific CSS (transitions, sizing)
├── types/
│   └── navigation.ts            # Navigation-related type definitions
└── config/
    └── nav-items.ts             # Navigation configuration
```

**Structure Decision**: Self-contained module within the existing Nx monorepo UI app. All remake code lives in `/apps/postybirb-ui/src/remake/` with no external dependencies on existing UI code. Custom layout using Mantine primitives (Box, Group, Stack, NavLink) instead of AppShell for maximum control.

## Complexity Tracking

> No constitution violations requiring justification.

## Phase Summary

| Phase | Deliverables | Status |
|-------|--------------|--------|
| Phase 0 | research.md | ✅ Complete |
| Phase 1 | data-model.md, contracts/, quickstart.md | ✅ Complete |
| Phase 2 | tasks.md (via `/speckit.tasks`) | ⏳ Pending |

## Dependencies to Update

| Package | Current | Target | Action |
|---------|---------|--------|--------|
| @mantine/core | ^7.17.4 | ^8.x | Update |
| @mantine/hooks | ^7.17.4 | ^8.x | Update |
| @mantine/dates | ^7.17.4 | ^8.x | Update |
| @mantine/dropzone | ^7.17.4 | ^8.x | Update (if needed) |
| @mantine/form | ^7.17.4 | ^8.x | Update (if needed) |
| @mantine/notifications | ^7.17.4 | ^8.x | Update (if needed) |
| @mantine/spotlight | ^7.17.4 | ^8.x | Update (if needed) |

**Already Available** (no changes needed):
- @lingui/core, @lingui/react, @lingui/macro - Already installed for i18n
- react-router, react-router-dom v6.17.0 - Already installed
- @tabler/icons-react - Already installed

**Note**: Check @blocknote/mantine compatibility with Mantine v8.

## Implementation Tasks (High-Level)

These will be detailed in `tasks.md` via `/speckit.tasks`:

1. **Setup & Dependencies**
   - Update Mantine packages to v8
   - Create `/remake` directory structure
   - Set up MantineProvider and React Router

2. **i18n Provider**
   - Implement `RemakeI18nProvider` based on existing `app-i18n-provider.tsx`
   - Dynamic locale loading with Lingui
   - Wrap app with i18n provider

3. **Core Layout Components**
   - Implement `Layout` with custom flexbox structure (no AppShell)
   - Implement `SideNav` with collapse functionality using NavLink
   - Implement `SubNavBar` with horizontal scroll
   - Implement `ContentNavbar` with pagination
   - Implement `ContentArea` wrapper

4. **Navigation & Routing**
   - Define route configuration
   - Create demo page components (Home, Submissions, Settings)
   - Wire up navigation items to routes

5. **State Management**
   - Implement `useSideNav` hook with localStorage persistence
   - Connect sidenav state to Layout

6. **Integration & Polish**
   - Verify all acceptance criteria
   - Add loading states
   - Handle edge cases (empty sub-nav, single page)
