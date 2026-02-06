# Performance Analysis

**Source**: `index.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/index.tsx`

## Overview
Root application component (`PostyBirb`). Sets up MantineProvider with dynamic theme, I18nProvider, Notifications, Disclaimer, and an inner `AppContent` that syncs color scheme and wraps the Layout in QueryClientProvider + ErrorBoundary. Calls `loadAllStores()` on mount.

## Memoization Usage
- [x] useMemo — `createAppTheme(primaryColor)` memoized on `[primaryColor]`. ✅ Good usage — avoids recreating theme object on every render.
- [ ] useCallback — not used (not needed)
- [ ] React.memo — not used (root component, not needed)

## Re-render Triggers
- **`PostyBirb`**:
  - `usePrimaryColor()` — re-renders when primary color changes (rare, user-initiated). ✅
  - `useEffect` calling `loadAllStores()` — runs once on mount. ✅
- **`AppContent`**:
  - `useColorScheme()` — re-renders when color scheme changes (rare). ✅
  - `useMantineColorScheme()` — Mantine context hook.
  - `useEffect` syncing color scheme — runs when `colorScheme` changes.

## Store Subscriptions
- Appearance store (via `usePrimaryColor`, `useColorScheme`).

## Potential Issues
- **`loadAllStores()` called in a `useEffect` without cleanup** — if the component unmounts and remounts (React strict mode), it will call `loadAllStores()` twice. The `loadAll` functions have a `loading` state guard, so the second call is a no-op. Acceptable.
- **`QueryClient` created at module level** — stable reference, not recreated. ✅
- **Nested providers stack**: MantineProvider → I18nProvider → Notifications → Disclaimer → QueryClientProvider → ErrorBoundary → Layout. Each provider adds a React context consumer. 6 levels of providers is normal and not a performance concern.

## Recommendations
- No significant performance issues in the root component.
- The `loadAllStores` in `useEffect` could use the `useInitializeStores` hook from `store-init.ts` instead of calling `loadAllStores` directly, to get proper loading/error state handling.

---
*Status*: Analyzed
