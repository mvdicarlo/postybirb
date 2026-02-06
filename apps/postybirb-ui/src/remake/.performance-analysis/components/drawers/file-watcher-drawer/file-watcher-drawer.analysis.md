# Performance Analysis

**Source**: `components/drawers/file-watcher-drawer/file-watcher-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/file-watcher-drawer/file-watcher-drawer.tsx`

## Overview
File watcher management drawer (400 lines). Card-based layout with folder picker, import action selector, template picker, save/delete per card. Contains `FileWatcherCard`, `CreateWatcherButton`, `WatcherList`, and main `FileWatcherDrawer`.

## Memoization Usage
- [x] useMemo — `importActionOptions` in FileWatcherCard (empty deps) ✅
- [x] useCallback — `handlePickFolder`, `handleConfirmPath`, `handleCancelPath`, `handleSave`, `handleDelete` in FileWatcherCard; `handleCreate` in CreateWatcherButton ✅
- [ ] React.memo — **NOT used on `FileWatcherCard`**

## Re-render Triggers
- `useActiveDrawer()` — re-renders on any drawer change.
- `useDirectoryWatchers()` — subscribes to directory watcher entity store.
- Each `FileWatcherCard` has 6 `useState` hooks for local form state.

## Store Subscriptions
- Directory watcher entity store.
- Drawer UI store.

## Potential Issues
- **IIFE for ConfirmActionModal** — `{(() => { ... })()}` creates JSX inside FileWatcherCard's render. This runs on every render, creating new JSX elements. Could be extracted to a sub-component.
- **`FileWatcherCard` not memoized** — when the watchers array updates from store, all cards re-render. With many watchers, this causes unnecessary re-renders. However, file watchers are typically few (<5).
- **`importActionOptions` useMemo with empty deps** — contains `t()` call. Won't update on locale change.

## Recommendations
- Extract the IIFE ConfirmActionModal to a named sub-component.
- Low priority — file watchers are typically few, and the drawer is user-initiated.

---
*Status*: Analyzed
