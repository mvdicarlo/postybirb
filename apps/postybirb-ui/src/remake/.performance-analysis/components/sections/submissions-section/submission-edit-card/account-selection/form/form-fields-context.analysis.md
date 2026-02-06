# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/form-fields-context.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/form-fields-context.tsx`

## Overview
Context provider for website option forms (~160 lines). Fetches form metadata via react-query. Provides optimistic local value updates with debounced API saves. Core form infrastructure.

## Memoization Usage
- [x] useMemo — `contextValue` ✅
- [x] useCallback — `getField`, `getValue`, `setValue` ✅

## Re-render Triggers
- Props: `option`, `submission`.
- `useState` for `localValues`.
- `useQuery` for `formFields`, `isLoading`, `isError`.
- `useEffect` syncs local values when option changes.
- `useRef` for `saveTimerRef`, `optionIdRef`.

## Store Subscriptions
None — form metadata fetched via react-query.

## Potential Issues
- **⚠️ HIGH: `getValue` changes on every `localValues` or `option.data` change** — `getValue` is in `useCallback` with deps `[option.data, localValues]`. Every `setValue` call updates `localValues` state, which recreates `getValue`, which changes `contextValue`, which re-renders ALL consumers (every form field). This means typing in one field re-renders ALL fields.
- **⚠️ `setValue` closes over `localValues` and `option.data`** — the debounced save merges `...option.data, ...localValues, [name]: value`. If multiple fields are edited quickly, earlier localValues might be stale in the closure.
- **`contextValue` has 8 deps** — any change triggers context update.
- **`useEffect` for syncing local values** — compares each local value to server value, potentially creates new object reference even when nothing changed.

## Recommendations
- **HIGH**: Split context into two: data context (formFields, option, submission) and actions context (getField, getValue, setValue). This prevents action changes from re-rendering field components that only read metadata.
- Use `useRef` for localValues in the save closure to avoid stale closures.
- Consider per-field subscription pattern instead of context-based broadcasting.

---
*Status*: Analyzed
