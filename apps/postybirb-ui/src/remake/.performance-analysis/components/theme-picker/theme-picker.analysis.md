# Performance Analysis

**Source**: `components/theme-picker/theme-picker.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/theme-picker/theme-picker.tsx`

## Overview
Light/dark mode toggle NavLink component (68 lines). Reads current color scheme from Mantine and toggles between light/dark on click.

## Memoization Usage
None.

## Re-render Triggers
- `useMantineColorScheme()` — re-renders on theme change.
- `useAppearanceActions()` — store actions (stable reference if selector is good).

## Store Subscriptions
- Mantine color scheme context.
- Appearance store (actions only).

## Potential Issues
- **`toggleTheme` not memoized** — inline function. Minor since NavLink doesn't optimize child function props.

## Recommendations
None significant — clean simple component, renders only on theme change.

---
*Status*: Analyzed
