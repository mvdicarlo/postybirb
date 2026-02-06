# Performance Analysis

**Source**: `components/drawers/custom-shortcuts-drawer/custom-shortcuts-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/custom-shortcuts-drawer/custom-shortcuts-drawer.tsx`

## Overview
Custom text shortcuts management drawer (442 lines). Features expandable cards with inline name editing and BlockNote description editor, search filtering, and create/delete operations. Contains `ShortcutCard`, `CreateShortcutForm`, and main `CustomShortcutsDrawer` sub-components.

## Memoization Usage
- [x] useMemo — `filteredAndSortedShortcuts` in `useShortcutSearch` (keyed on shortcuts, debouncedSearch) ✅
- [x] useMemo — `existingNames` Set for duplicate checking ✅
- [x] useCallback — `toggleExpanded`, `handleDelete`, `handleCreateSuccess` ✅
- [x] useDebouncedValue — 200ms search debounce ✅
- [ ] React.memo — **NOT used on ShortcutCard**

## Re-render Triggers
- `useCustomShortcuts()` — subscribes to custom shortcuts entity store.
- `useCustomShortcutsLoading()` — loading state subscription.
- `useState` for `searchQuery`, `expandedIds`, `isCreating` — local state.

## Store Subscriptions
- Custom shortcuts entity store (via `useCustomShortcuts`, `useCustomShortcutsLoading`).

## Potential Issues
- **⚠️ `ShortcutCard` not memoized with `React.memo`** — when search query changes or expandedIds changes, ALL shortcut cards re-render. Each card contains a `DescriptionEditor` (BlockNote-based), which is expensive to re-render.
- **Each `ShortcutCard` has its own `useState` for `localDescription`** — initialized from prop but not synced if shortcut updates from websocket. If the shortcut is updated externally, the card shows stale data until closed/reopened.
- **`onToggleExpand={() => toggleExpanded(shortcut.id)}` creates a new closure per card** — since `ShortcutCard` is not memoized, this doesn't matter. But if `React.memo` were added, this closure pattern would break it.

## Recommendations
- **Add `React.memo` to `ShortcutCard`** — with the expensive `DescriptionEditor` inside, preventing unnecessary re-renders is worthwhile. Would need to pass `shortcut.id` + `isExpanded` as stable props and use `useCallback` for `onToggleExpand`.
- Low-medium priority — drawer is only open when user is actively managing shortcuts.

---
*Status*: Analyzed
