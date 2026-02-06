# Performance Analysis

**Source**: `stores/records/notification-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/notification-record.ts`

## Overview
Record class for notification entities. Extends `BaseRecord` with `title`, `message`, `tags`, `data`, `isRead`, `hasEmitted`, `type` fields and boolean getters.

## Memoization Usage
- [x] useMemo — N/A
- [x] useCallback — N/A
- [x] React.memo — N/A

## Re-render Triggers
N/A — plain class.

## Store Subscriptions
None.

## Potential Issues
None — simple property reads, no array operations in getters.

## Recommendations
None — clean record class.

---
*Status*: Analyzed
