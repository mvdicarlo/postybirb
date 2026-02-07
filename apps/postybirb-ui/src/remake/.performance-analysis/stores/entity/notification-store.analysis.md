# Performance Analysis

**Source**: `stores/entity/notification-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/notification-store.ts`

## Overview
Notification entity store. Uses `createEntityStore` directly. Has a **side-effect websocket listener** (`NOTIFICATION_UPDATES`) that shows Mantine UI notifications for new items. Provides filter hooks: `useUnreadNotifications`, `useUnreadNotificationCount`, `useErrorNotifications`, `useWarningNotifications`.

## Memoization Usage
- [x] useShallow — in most selectors

## Re-render Triggers
- **`useNotifications`**: no `useShallow` — re-renders on every store update.
- **`useNotificationsMap`**: no `useShallow` — same concern.
- **`useUnreadNotificationCount`**: filters the entire array to count unreads — no `useShallow`, re-renders on every update and recomputes count.

## Store Subscriptions
- Subscribes to `NOTIFICATION_UPDATES` (twice! once for the store via `createEntityStore`, once for the `showUINotification` side effect).

## Potential Issues
- **⚠️ Duplicate websocket subscription** — `NOTIFICATION_UPDATES` is subscribed to in two places: once by `createEntityStore` (updates store) and once by the module-level `AppSocket.on(NOTIFICATION_UPDATES, ...)` that calls `showUINotification`. Both handlers fire on every event. The `showUINotification` handler iterates ALL notifications in the payload, not just new ones. *(Deferred — to be addressed in a separate pass.)*
- ~~**`useNotifications` has no `useShallow`** — re-renders on every store update.~~ **Fixed** — `useShallow` added.
- ~~**`useNotificationsMap` has no `useShallow`** — same concern.~~ **Fixed** — `useShallow` added.
- **`useUnreadNotificationCount` does a full filter without `useShallow`** — returns a primitive (number), so `useShallow` isn't needed for the return value, but the filter still runs on every update. Mitigated by upstream diffing skipping `setState` when nothing changed.
- **`showUINotification` calls `notificationApi.update()` in `onClose`** — this triggers another update cycle when a notification toast is closed.

## Recommendations
- Deduplicate the websocket handler — handle UI notifications inside the store's `setRecords` or a middleware, not via a separate socket listener. *(Deferred.)*
- The `showUINotification` side-effect iterating all notifications on every push could be optimized to only process genuinely new ones (compare against previous set). *(Deferred.)*

---
*Status*: Analyzed
