# Performance Analysis

**Source**: `components/layout/layout.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/layout/layout.tsx`

## Overview
Root layout component. Orchestrates the overall page structure: SideNav, SectionPanel (master), PrimaryContent (detail), all drawers, and the SettingsDialog. Uses state-driven navigation.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- `useSidenavCollapsed()` — re-renders when sidenav collapses/expands.
- `useSubmissionsUIStore((state) => state.setSidenavCollapsed)` — selector returns a function, should be stable. ✅
- `useViewState()` — re-renders on ANY navigation change.
- `useSubNavVisible()` — re-renders when section panel visibility changes.
- `useKeybindings()` — sets up global keybindings, likely stable after mount.

## Store Subscriptions
- Submissions UI store (via `useSidenavCollapsed`, `useSubmissionsUIStore`).
- Navigation store (via `useViewState`).
- Submissions UI store again (via `useSubNavVisible`).

## Potential Issues
- **⚠️ HIGH: `Layout` is the root component and re-renders on EVERY navigation change** — when `viewState` changes, `Layout` re-renders, which re-renders ALL child components including `SideNav`, `SectionPanel`, `PrimaryContent`, and all 7 drawer components.
- **All 7 drawer components are always mounted** — `TagGroupDrawer`, `TagConverterDrawer`, etc. are all rendered regardless of whether they're open. Each drawer does `useActiveDrawer()` check internally, but the component function still executes on every Layout re-render.
- **`useSubNavVisible()` may cause extra re-renders** — if this returns a new object `{ visible: boolean }` on every store update, it could trigger Layout re-renders even when visibility hasn't changed.

## Recommendations
- **Memoize `SideNav`** with `React.memo` — it only depends on `navItems` (constant), `collapsed`, and `onCollapsedChange`.
- **Consider lazy-mounting drawers** — only mount a drawer component when its drawer is active. This would eliminate 7 unnecessary component executions per navigation change.
- **Extract the drawer section** into a separate `DrawerHost` component that only subscribes to drawer state, isolating drawer re-renders from navigation changes.
- High priority — this is the root component; inefficiencies here cascade to the entire app.

---
*Status*: Analyzed
