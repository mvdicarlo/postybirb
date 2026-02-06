# Performance Analysis

**Source**: `components/sections/accounts-section/hooks/use-account-actions.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/hooks/use-account-actions.ts`

## Overview
Hook that returns bound action handlers for a specific account (58 lines). Wraps `AccountsContext` callbacks with the account ID pre-bound.

## Memoization Usage
- [x] useMemo — creates bound handler object (keyed on `context` and `accountId`) ✅

## Re-render Triggers
- Context value changes (from `useAccountsContext`).
- `accountId` prop changes.

## Store Subscriptions
None directly — consumes context.

## Potential Issues
- **Depends on `context` object reference** — if context value is recreated (parent doesn't memoize callbacks), this useMemo recomputes every render for every AccountRow. This is the same cascading issue as identified in accounts-context.

## Recommendations
- Ensure context value is stable (fix the parent memoization issue).

---
*Status*: Analyzed
