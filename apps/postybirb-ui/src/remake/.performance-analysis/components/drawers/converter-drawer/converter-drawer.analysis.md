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
- ~~**⚠️ HIGH: No `React.memo` on ConverterCard** — when any state changes in the parent (search query, selection, expansion), ALL converter cards re-render. With 50+ converters visible, typing in search causes all cards to re-render on every keystroke (before debounce settles).~~ **Fixed** — `React.memo` added to `ConverterCard`.
- ~~**⚠️ Multiple `WebsiteConversionsEditor` store subscriptions** — each expanded card creates a new `useWebsites()` subscription. With 5 expanded cards, there are 5 independent website store subscriptions.~~ **Fixed** — `useWebsites()` lifted to `ConverterDrawer`, `websites` and `websiteMap` passed as props.
- **`handleSelectAll` depends on `filteredConverters`** — recreated when filtered list changes. This is passed to the checkbox, causing it to re-render. Minor since it's one checkbox.
- **`existingValues` Set recreated when `config` reference changes** — `config` is memoized with `[]` deps in both parents. ✅ Stable.
- ~~**`activeWebsiteIds` filter `(id) => id in localConvertTo`** is always true for `Object.keys(localConvertTo)` — the filter is redundant.~~ **Fixed** — redundant filter removed.

## Recommendations
- ~~**Add `React.memo` to `ConverterCard`** — with useCallback already on handlers, this would prevent re-rendering unchanged cards when search/selection changes.~~ **Done.**
- ~~**Stabilize `config` prop** — use `useMemo` in the parent (TagConverterDrawer) to avoid busting `existingValues` memo.~~ Already stable (both parents use `useMemo` with `[]`).
- ~~**Consider lifting `useWebsites` to the parent** and passing `websiteMap` as a prop to `WebsiteConversionsEditor` to avoid duplicate subscriptions.~~ **Done.**
- ~~Remove redundant `activeWebsiteIds` filter.~~ **Done.**

---
*Status*: Analyzed
