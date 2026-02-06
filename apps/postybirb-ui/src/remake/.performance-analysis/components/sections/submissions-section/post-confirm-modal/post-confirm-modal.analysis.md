# Performance Analysis

**Source**: `components/sections/submissions-section/post-confirm-modal/post-confirm-modal.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/post-confirm-modal/post-confirm-modal.tsx`

## Overview
Modal for confirming and reordering submissions before posting (~170 lines). Shows reorderable list, resume mode selector for failed posts.

## Memoization Usage
- [x] useMemo — `hasFailedPosts` ✅
- [x] useCallback — `handleConfirm` ✅

## Re-render Triggers
- Props: `opened`, `onClose`, `onConfirm`, `selectedSubmissions`, `totalSelectedCount`, `loading`.
- `useState` for `orderedSubmissions`, `resumeMode`.
- `useEffect` resets on open.
- `useLingui()` — locale.

## Store Subscriptions
None — pure prop-driven.

## Potential Issues
- **`validSubmissions` computed inline** (`.filter()`) — runs every render. Should be memoized.
- **`useEffect` dep is `opened`** — eslint disable for exhaustive deps. If `selectedSubmissions` changes while open, order won't update.

## Recommendations
- Memoize `validSubmissions`.
- Low priority — modal is open briefly.

---
*Status*: Analyzed
