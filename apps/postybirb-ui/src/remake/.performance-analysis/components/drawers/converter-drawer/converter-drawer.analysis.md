# Performance Analysis

**Source**: `components/drawers/converter-drawer/converter-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/converter-drawer/converter-drawer.tsx`

## Overview
Largest drawer component (802 lines). Generic converter drawer shared by tag/user converter drawers. Features search, expandable cards, bulk selection/delete, inline website conversion editing with debounced save. Contains 7 sub-components: `useConverterSearch` hook, `WebsiteConversionRow`, `AddWebsiteDropdown`, `WebsiteConversionsEditor`, `ConverterCard`, `DeleteSelectedButton`, `CreateConverterForm`, and the main `ConverterDrawer`.

## Memoization Usage
- [x] useMemo — `filteredAndSortedConverters` (keyed on converters, getPrimaryValue, debouncedSearch) ✅
- [x] useMemo — `filteredOptions` in AddWebsiteDropdown (keyed on availableWebsites, search) ✅
- [x] useMemo — `websiteMap`, `activeWebsiteIds`, `availableWebsites` in WebsiteConversionsEditor ✅
- [x] useMemo — `existingValues` in ConverterDrawer for duplicate check ✅
- [x] useCallback — `handleSelect`, `handleSelectAll`, `handleToggleExpand`, `handleClearSelection`, `handleCreate` in main component ✅
- [x] useCallback — `handleUpdate` in ConverterCard ✅
- [x] useCallback — `handleDelete` in DeleteSelectedButton ✅
- [x] useDebouncedCallback — 300ms debounce on save in WebsiteConversionsEditor ✅
- [x] useDebouncedValue — 200ms debounce on search in useConverterSearch ✅
- [ ] React.memo — **NOT used on any sub-component**

## Re-render Triggers
- **Main ConverterDrawer**: re-renders on any state change (searchQuery, selectedIds, expandedIds) or when `converters` prop changes (from store).
- **ConverterCard**: re-renders when parent re-renders (no React.memo). Each card re-renders when ANY state in the parent changes.
- **WebsiteConversionsEditor**: `useWebsites()` subscribes to website store — re-renders on website store updates (even when the drawer is open for converters).

## Store Subscriptions
- Website entity store (in `WebsiteConversionsEditor` via `useWebsites`). Each expanded converter card has its own `WebsiteConversionsEditor` instance, each subscribing to the website store independently.

## Potential Issues
- **⚠️ HIGH: No `React.memo` on ConverterCard** — when any state changes in the parent (search query, selection, expansion), ALL converter cards re-render. With 50+ converters visible, typing in search causes all cards to re-render on every keystroke (before debounce settles).
- **⚠️ Multiple `WebsiteConversionsEditor` store subscriptions** — each expanded card creates a new `useWebsites()` subscription. With 5 expanded cards, there are 5 independent website store subscriptions.
- **`handleSelectAll` depends on `filteredConverters`** — recreated when filtered list changes. This is passed to the checkbox, causing it to re-render. Minor since it's one checkbox.
- **`existingValues` Set recreated when `config` reference changes** — `config` is likely a new object on every parent render (created inline in TagConverterDrawer/UserConverterDrawer). This would bust the `useMemo` on every render.
- **`activeWebsiteIds` filter `(id) => id in localConvertTo`** is always true for `Object.keys(localConvertTo)` — the filter is redundant.

## Recommendations
- **Add `React.memo` to `ConverterCard`** — with useCallback already on handlers, this would prevent re-rendering unchanged cards when search/selection changes.
- **Stabilize `config` prop** — use `useMemo` in the parent (TagConverterDrawer) to avoid busting `existingValues` memo.
- **Consider lifting `useWebsites` to the parent** and passing `websiteMap` as a prop to `WebsiteConversionsEditor` to avoid duplicate subscriptions.
- Remove redundant `activeWebsiteIds` filter.

---
*Status*: Analyzed
