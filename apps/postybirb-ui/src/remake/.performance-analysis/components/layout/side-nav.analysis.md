# Performance Analysis

**Source**: `components/layout/side-nav.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/layout/side-nav.tsx`

## Overview
Collapsible side navigation (226 lines). Contains `NavItemRenderer` (renders individual nav items: view, drawer, link, custom, theme, language) and `SideNav` (renders the full nav with header, scroll area, items). Handles active state by comparing viewState and activeDrawer.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used on `NavItemRenderer`

## Re-render Triggers
- `useViewState()` — re-renders on every navigation change.
- `useActiveDrawer()` — re-renders on every drawer open/close.
- `useState` for `appVersion` — one-time on mount.
- Props: `items`, `collapsed`, `onCollapsedChange`.

## Store Subscriptions
- Navigation store (via `useViewState`).
- Drawer store (via `useActiveDrawer`).

## Potential Issues
- **⚠️ `NavItemRenderer` creates NEW `useDrawerActions()` and `useViewStateActions()` hooks per item per render** — every nav item call these hooks independently. With 15 nav items, that's 30 hook subscriptions per render. The hooks return stable action objects, so this is primarily a wasted hook-call cost, not a subscription issue.
- **`NavItemRenderer` not memoized** — all nav items re-render when any viewState or drawer changes.
- **Inline arrow functions in `MantineNavLink` `onClick`** — `() => setViewState(item.viewState)`, `() => toggleDrawer(item.drawerKey)` create new closures per item per render.
- **`appVersion` useState + useEffect pattern** — fetches version once on mount, fine. But `window.electron?.getAppVersion()` is awaited without cleanup (unmount guard). Minor.

## Recommendations
- **Move `useDrawerActions()` and `useViewStateActions()` to `SideNav`** and pass the action functions down as props to `NavItemRenderer`. Avoids 2×N hook calls per render.
- **Memoize `NavItemRenderer` with `React.memo`** — given stable action props, items would only re-render when `isActive` or `collapsed` changes.
- Medium priority — SideNav re-renders on every navigation change but is a relatively simple render tree.

---
*Status*: Analyzed
