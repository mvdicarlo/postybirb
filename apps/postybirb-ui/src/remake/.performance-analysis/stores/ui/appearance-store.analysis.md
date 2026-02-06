# Performance Analysis

**Source**: `stores/ui/appearance-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/ui/appearance-store.ts`

## Overview
Appearance state store with localStorage persistence. Manages `colorScheme`, `primaryColor`, `submissionViewMode`. Uses `persist` middleware.

## Memoization Usage
- [x] useShallow — in `useAppearanceActions`, `useSubmissionViewMode`

## Re-render Triggers
- **`useColorScheme`**: single value selector — only re-renders when color scheme actually changes. ✅
- **`usePrimaryColor`**: same — clean. ✅
- **`useIsCompactView`**: derived boolean — clean. ✅
- **`useAppearanceActions`**: `useShallow` bundles state + actions — re-renders when either `colorScheme` or `primaryColor` changes (even if only one changed). Could be split.

## Store Subscriptions
None from websocket. Persists to localStorage.

## Potential Issues
- **`useAppearanceActions` includes both state AND actions** — if a component only needs `setColorScheme`, it still re-renders when `primaryColor` changes. Minor concern since these change rarely (user manually changing theme).

## Recommendations
- Consider splitting `useAppearanceActions` into separate state and action hooks if any component only needs actions.
- Very low priority — appearance changes are user-initiated and infrequent.

---
*Status*: Analyzed
