# Performance Analysis

**Source**: `components/sections/submissions-section/submission-history-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-history-drawer.tsx`

## Overview
Drawer for viewing post history (~450 lines). Shows post records with expandable accordions, website-level success/failure, JSON export. Contains helper functions and sub-components.

## Memoization Usage
- [x] useMemo — `descendingRecords` (sorted post records) ✅

## Re-render Triggers
- Props: `opened`, `onClose`, `submission`.
- `useAccountsMap()` — all accounts map.

## Store Subscriptions
- Account entity store (full map).

## Potential Issues
- **`useAccountsMap()` subscribes to all accounts** — any account change re-renders the drawer. Only matters when drawer is open.
- **`PostRecordCard` sub-component calls `useLocale()` and `JSON.stringify`** — `JSON.stringify(record, null, 2)` runs on every render for each card. Should memoize.
- **`extractWebsitePostsFromEvents` runs per card per render** — pure function, cheap but could be memoized.

## Recommendations
- Memoize `formattedJson` with `useMemo` in `PostRecordCard`.
- Wrap `PostRecordCard` in `React.memo`.
- Low priority — drawer is only open occasionally.

---
*Status*: Analyzed
