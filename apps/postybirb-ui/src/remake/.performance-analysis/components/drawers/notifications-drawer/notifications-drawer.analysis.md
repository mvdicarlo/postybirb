# Performance Analysis

**Source**: `components/drawers/notifications-drawer/notifications-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/notifications-drawer/notifications-drawer.tsx`

## Overview
Notifications management drawer (581 lines). Features read/unread and type filtering via SegmentedControls, selectable notification cards with bulk mark-as-read and bulk delete, individual read/unread toggle and delete. Contains `useNotificationFilters` hook, filter components, `BulkActions`, `NotificationCard`, `NotificationList`, and main `NotificationsDrawer`.

## Memoization Usage
- [x] useMemo — `filteredNotifications` in `useNotificationFilters` (keyed on allNotifications, readFilter, typeFilter) ✅
- [x] useCallback — `handleMarkAsRead`, `handleDelete` in BulkActions; `handleToggleRead`, `handleDelete` in NotificationCard; `handleSelect`, `handleSelectAll`, `handleClearSelection` in main ✅
- [ ] React.memo — **NOT used on NotificationCard or filter components**

## Re-render Triggers
- `useActiveDrawer()` — re-renders main component on any drawer change.
- `useUnreadNotificationCount()` — re-renders on every notification store update (filter + count computation each time, see notification-store analysis).
- `useNotifications()` — re-renders on every notification store update.
- `useState` for `selectedIds`, filters — local state.

## Store Subscriptions
- Notification entity store (via `useNotifications`, `useUnreadNotificationCount`).
- Drawer UI store (via `useActiveDrawer`, `useDrawerActions`).

## Potential Issues
- **⚠️ HIGH: `NotificationCard` not memoized** — when selection state changes on any card, ALL notification cards re-render. Each card calls `useLocale()` for `formatRelativeTime` and has `useCallback` wrappers, but the component itself re-renders.
- **⚠️ `useNotifications()` re-renders on every store update** — the `useNotifications` hook does NOT use `useShallow` (see notification-store analysis). Every websocket push re-renders this entire drawer tree.
- **`BulkActions` filters `notifications` to find selected** — `selectedNotifications` is computed inline (not memoized) on every render.
- **`handleMarkAsRead` fires parallel `Promise.all` for each selected notification** — with 50 selected, that's 50 simultaneous API calls.
- **`NotificationCard` calls `useLocale()` per card** — each card creates its own locale hook subscription. Could be lifted to the list level.

## Recommendations
- ✅ **Done**: Added `React.memo` to `NotificationCard`.
- ✅ **Done**: Lifted `useLocale()` to `NotificationsDrawerContent` and passed `formatRelativeTime` as prop through `NotificationList` to cards.
- **Batch the mark-as-read API calls** — use a single API endpoint instead of N parallel calls. *(Backend change — out of scope)*
- ✅ **Done (prior)**: `useShallow` already added to `useNotifications` in notification-store during entity store phase.

---
*Status*: ✅ Optimized
