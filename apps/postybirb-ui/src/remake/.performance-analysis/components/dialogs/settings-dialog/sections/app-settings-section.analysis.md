# Performance Analysis

**Source**: `components/dialogs/settings-dialog/sections/app-settings-section.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/dialogs/settings-dialog/sections/app-settings-section.tsx`

## Overview
Settings section for app startup, UI mode selection, server port, and app folder configuration. Uses `react-query` to fetch startup settings. Contains inline API calls for settings updates.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used; event handlers are inline arrow functions
- [ ] React.memo — not used

## Re-render Triggers
- `useMantineColorScheme()` — re-renders on color scheme changes (though `colorScheme` is destructured but **not actually used** in the component).
- `useQuery('startup-settings')` — re-renders on query state changes (loading, data, refetch).
- `useState` for `currentUIMode`, `pendingUIMode` — local state.

## Store Subscriptions
None directly via Zustand. Uses `useMantineColorScheme` (Mantine context) and `useQuery` (react-query).

## Potential Issues
- **⚠️ `useMantineColorScheme()` subscribed but unused** — `colorScheme` is destructured but never referenced in the JSX. This causes unnecessary re-renders when the color scheme changes.
- **Inline `onChange` handlers call API + `refetch` directly** — the Switch and TextInput fire API calls on every change without debouncing. The port TextInput fires an API call on every keystroke that passes validation.
- **`cacheTime: 0` on useQuery** — means re-opening this settings section always refetches. Acceptable for settings.
- **Icon components (`IconFolder`, `IconRefresh`, `IconRouter`) are created inline** — new instances on every render. Minor since this is a settings modal, not a high-frequency component.

## Recommendations
- **Remove unused `useMantineColorScheme()` import/call** — eliminates unnecessary re-renders.
- **Debounce the port TextInput `onChange`** — currently fires an API call on every keystroke (e.g., typing "3000" fires calls for "3", "30", "300", "3000").
- Low priority overall — this component is inside a modal that's rarely open.

---
*Status*: Analyzed
