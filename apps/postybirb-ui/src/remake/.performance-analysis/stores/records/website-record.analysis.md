# Performance Analysis

**Source**: `stores/records/website-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/website-record.ts`

## Overview
Record class for website info entities. Does NOT extend `BaseRecord` (no createdAt/updatedAt). Stores display name, login type, metadata, accounts, file options, and capability flags.

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

## Re-render Triggers
N/A — plain class.

## Store Subscriptions
None.

## Potential Issues
- **`loggedInAccounts` getter filters accounts array on every access** — could be called frequently in account-related views. O(n) per access.
- **`loggedInCount` calls `loggedInAccounts` which re-filters** — double-filtering if both are accessed.

## Recommendations
- Cache `loggedInAccounts` in constructor since the record is immutable.
- Derive `loggedInCount` from the cached value.

---
*Status*: Analyzed
