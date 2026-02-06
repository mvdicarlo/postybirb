# Performance Analysis

**Source**: `components/dialogs/settings-dialog/sections/notifications-settings-section.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/dialogs/settings-dialog/sections/notifications-settings-section.tsx`

## Overview
Desktop notification preference toggles. Master enable switch plus individual toggles for post success/failure and file watcher success/failure. Calls `settingsApi.update` on each toggle.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used; `updateDesktopNotifications` is recreated each render
- [ ] React.memo — not used

## Re-render Triggers
- `useSettings()` — subscribes to settings entity store. Re-renders on any settings change.

## Store Subscriptions
- Settings entity store (via `useSettings`).

## Potential Issues
- **`updateDesktopNotifications` helper recreated every render** — it captures `settings` from closure. Since it's only called on user click, this is fine.
- **`useSettings()` subscribes to entire settings record** — re-renders on any setting change, not just notification settings. Acceptable for a settings modal.
- **Inline spread `...settings.settings` on every toggle** — creates new settings object for API call. Fine for user-paced actions.

## Recommendations
None — clean, simple component. Low priority (settings modal).

---
*Status*: Analyzed
