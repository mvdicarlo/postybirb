# Performance Analysis

**Source**: `components/sections/home-section/account-health-panel.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/account-health-panel.tsx`

## Overview
Account health summary panel (131 lines). Shows logged-in count, progress bar, and health status badge.

## Memoization Usage
None — inline computations (loggedInCount, healthPercentage).

## Re-render Triggers
- `useAccounts()` — all accounts.
- `useViewStateActions()` — setViewState action.

## Store Subscriptions
- Account entity store (all).
- Navigation store (actions).

## Potential Issues
- **`accounts.filter(a => a.isLoggedIn).length` computed inline** — runs on every render. Should be memoized if parent also triggers re-renders.
- Already also subscribed from parent `HomeContent` — double subscription, but each component needs its own.

## Recommendations
- Wrap in `React.memo` to prevent unnecessary re-renders from parent.
- Memoize `loggedInCount` and `healthPercentage`.

---
*Status*: Analyzed
