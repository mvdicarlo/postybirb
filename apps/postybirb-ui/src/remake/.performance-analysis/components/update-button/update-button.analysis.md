# Performance Analysis

**Source**: `components/update-button/update-button.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/update-button/update-button.tsx`

## Overview
Update availability indicator (142 lines). Uses `react-query` to poll an update endpoint every 5 minutes. Renders null if no update, otherwise shows a NavLink that opens a Popover with update notes and download button. Uses `dangerouslySetInnerHTML` for release notes.

## Memoization Usage
None explicit — relies on react-query caching.

## Re-render Triggers
- `useQuery` refetches every 5 minutes (`refetchInterval: 300_000`), re-renders on success.
- `useDisclosure()` for popover state.
- `useLingui()` for localization.

## Store Subscriptions
None — uses react-query, not Zustand.

## Potential Issues
- **`dangerouslySetInnerHTML`** — XSS risk if update notes contain untrusted HTML. Functional concern, not perf.
- **Polling every 5 min** — triggers re-render cycle even when no update. `react-query` handles this well with stale checks.
- **`<ScrollArea>` with fixed height 300** — always renders even if notes are short. Minor.

## Recommendations
- Sanitize HTML before `dangerouslySetInnerHTML` (security, not perf).
- No performance changes needed — well-structured with react-query caching.

---
*Status*: Analyzed
