# Performance Analysis

**Source**: `stores/records/user-converter-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/user-converter-record.ts`

## Overview
Record class for user converter entities. Extends `BaseRecord` with `username` and `convertTo` (Record<WebsiteId, string>) fields.

## Memoization Usage
- [x] useMemo — N/A
- [x] useCallback — N/A
- [x] React.memo — N/A

## Re-render Triggers
N/A — plain class.

## Store Subscriptions
None.

## Potential Issues
None — simple property access only, no expensive computed getters.

## Recommendations
None — clean record class.

---
*Status*: Analyzed
