# Performance Analysis

**Source**: `config/nav-items.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/config/nav-items.tsx`

## Overview
Navigation item configuration array. Defines all sidenav items with icons (Tabler), labels (Lingui `<Trans>`), keyboard shortcuts, and associated actions (view state changes, drawer toggles, external links).

## Memoization Usage
N/A — static configuration array.

## Re-render Triggers
N/A — not a hook or component. However, components that consume `navItems` will re-render when their parent re-renders, and the icon/label JSX elements will be recreated.

## Store Subscriptions
None directly. The `navItems` array references `ViewState` factory functions and `DrawerKey` values.

## Potential Issues
- **JSX elements in static config** — `<Trans>` and `<Icon>` components are created at module evaluation time. Since they're React elements (objects), they get a stable reference. However, `<Trans>` depends on the i18n context and will be re-evaluated by React on each render where these are used.
- **`openUrl` called directly in `onClick`** — this is fine since it's only triggered on user click.

## Recommendations
None — this is declarative configuration. The icons and labels are lightweight.

---
*Status*: Analyzed
