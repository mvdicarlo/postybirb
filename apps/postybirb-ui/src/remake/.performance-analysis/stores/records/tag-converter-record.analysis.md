# Performance Analysis

**Source**: `stores/records/tag-converter-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/tag-converter-record.ts`

## Overview
Record class for tag converter entities. Extends `BaseRecord` with `tag` and `convertTo` (Record<WebsiteId, Tag>) fields. Getters for per-website conversions.

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
