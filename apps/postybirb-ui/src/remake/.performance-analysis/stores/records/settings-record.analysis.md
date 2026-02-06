# Performance Analysis

**Source**: `stores/records/settings-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/settings-record.ts`

## Overview
Record class for the application settings singleton. Extends `BaseRecord` with settings options access, hidden websites, language, ad preferences, desktop notifications, and a `toDto()` method for serialization.

## Memoization Usage
- [x] useMemo — N/A
- [x] useCallback — N/A
- [x] React.memo — N/A

## Re-render Triggers
N/A — plain class.

## Store Subscriptions
None.

## Potential Issues
- `hiddenWebsites` getter returns the array reference from `this.settings.hiddenWebsites`. If settings are recreated, this is fine since it's a new record each time.

## Recommendations
None — clean record class.

---
*Status*: Analyzed
