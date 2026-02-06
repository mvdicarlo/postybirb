# Performance Analysis

**Source**: `stores/records/tag-group-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/tag-group-record.ts`

## Overview
Record class for tag group entities. Extends `BaseRecord` with `name` and `tags` array. Simple getters for count, emptiness, and string representation.

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
