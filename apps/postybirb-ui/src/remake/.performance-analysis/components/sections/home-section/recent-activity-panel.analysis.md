# Performance Analysis

**Source**: `components/sections/home-section/recent-activity-panel.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/recent-activity-panel.tsx`

## Overview
Recent activity panel (121 lines). Shows last 5 notifications sorted by creation date with type-based icons.

## Memoization Usage
- [x] useMemo — `recentActivity` (sorts and slices notifications) ✅

## Re-render Triggers
- `useNotifications()` — all notifications.
- `useLocale()` — formatRelativeTime.

## Store Subscriptions
- Notification entity store (all).

## Potential Issues
- `getNotificationIcon` is a pure function called per notification per render — cheap.
- `formatRelativeTime` creates relative time strings per render — acceptable.

## Recommendations
- Wrap in `React.memo` to prevent parent-triggered re-renders.

---
*Status*: Analyzed
