# Performance Analysis

**Source**: `stores/records/account-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/account-record.ts`

## Overview
Record class for account entities. Extends `BaseRecord` with account-specific fields (`name`, `website`, `groups`, `state`, `websiteInfo`) and computed getters (`isLoggedIn`, `isPending`, `username`, etc.).

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

## Re-render Triggers
N/A — plain class.

## Store Subscriptions
None.

## Potential Issues
- Getters (`isLoggedIn`, `isPending`, etc.) are computed on every access. Since these are simple property reads (not array operations), this is negligible.

## Recommendations
None — clean record class.

---
*Status*: Analyzed
