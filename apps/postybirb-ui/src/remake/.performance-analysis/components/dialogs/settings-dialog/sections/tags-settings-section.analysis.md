# Performance Analysis

**Source**: `components/dialogs/settings-dialog/sections/tags-settings-section.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/dialogs/settings-dialog/sections/tags-settings-section.tsx`

## Overview
Tag search provider settings. Select dropdown for provider (None, e621, Danbooru) and toggle for wiki hover display. Calls `settingsApi.update` on change.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- `useLingui()` — re-renders on i18n context changes.
- `useSettings()` — subscribes to settings entity store.

## Store Subscriptions
- Settings entity store (via `useSettings`).

## Potential Issues
- **`tagProviders` array recreated on every render** — array of 3 objects with `t()` calls. Minor since it's 3 items.
- **Inline spread `...settings.settings` and `...settings.tagSearchProvider` on every change** — creates nested new objects for API call. Fine for user-paced actions.

## Recommendations
- Could memoize `tagProviders` with `useMemo` keyed on locale, but trivial cost for 3 items.
- Low priority — settings modal.

---
*Status*: Analyzed
