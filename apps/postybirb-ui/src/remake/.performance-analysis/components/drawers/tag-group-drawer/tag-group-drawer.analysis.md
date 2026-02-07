# Performance Analysis

**Source**: `components/drawers/tag-group-drawer/tag-group-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/tag-group-drawer/tag-group-drawer.tsx`

## Overview
Tag group management drawer (468 lines). Table-based layout with editable name cells, editable tags cells (TagsInput with debounced save), search, select-all, and bulk delete. Contains `EditableNameCell`, `EditableTagsCell`, `DeleteSelectedButton`, `CreateTagGroupForm`, `TagGroupRow`, `TagGroupsTable`, and main `TagGroupDrawer`.

## Memoization Usage
- [x] useMemo — `filteredAndSortedGroups` in `useTagGroupSearch` ✅
- [x] useCallback — `handleDelete` in `DeleteSelectedButton` ✅
- [x] useDebouncedCallback — 300ms debounce on tag saves in `EditableTagsCell` ✅
- [x] useDebouncedValue — 200ms search debounce ✅
- [ ] React.memo — **NOT used on `TagGroupRow`**
- [ ] useCallback — **NOT used** for `handleToggleSelect`, `handleToggleSelectAll` in main component

## Re-render Triggers
- `useActiveDrawer()` — re-renders on any drawer change.
- `useTagGroups()` — subscribes to tag group entity store.
- `useState` for `searchQuery`, `selectedIds` — local state.

## Store Subscriptions
- Tag group entity store (via `useTagGroups` inside `useTagGroupSearch`).
- Drawer UI store.

## Potential Issues
- **⚠️ `handleToggleSelect` and `handleToggleSelectAll` are NOT memoized with `useCallback`** — recreated on every render. Passed to `TagGroupsTable` → `TagGroupRow` → `Checkbox`. Since `TagGroupRow` is not memoized, this doesn't cause extra renders, but it does mean adding `React.memo` later would be ineffective without also stabilizing these handlers.
- **`TagGroupRow` not memoized** — each row contains `EditableNameCell` and `EditableTagsCell` with their own state. When selection changes on any row, all rows re-render.
- **`EditableTagsCell` local state not synced with store** — if tags are updated externally (websocket), the cell shows stale tags until drawer reopens.

## Recommendations
- ✅ **Done**: Wrapped `handleToggleSelect` and `handleToggleSelectAll` in `useCallback`; added `React.memo` to `TagGroupRow`.
- Low-medium priority — drawer is user-initiated and tag groups are typically few (<20).

---
*Status*: ✅ Optimized
