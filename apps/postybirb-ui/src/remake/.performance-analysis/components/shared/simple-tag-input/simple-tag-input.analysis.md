# Performance Analysis

**Source**: `components/shared/simple-tag-input/simple-tag-input.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/simple-tag-input/simple-tag-input.tsx`

## Overview
Tag input component (209 lines) with tag group support and search provider integration. Expands tag groups into individual tags, renders custom dropdown options for groups and search providers.

## Memoization Usage
- [x] useMemo — `tagGroupOptions` (keyed on tagGroups, value) ✅
- [x] useMemo — `dropdownData` (keyed on search.data, tagGroupOptions) ✅
- [x] useMemo — `inputDescription` (keyed on maxTags, value.length, description) ✅
- [x] useCallback — `handleChange` ✅
- [x] useCallback — `handleClear` ✅
- [x] useCallback — `renderOption` (keyed on search.provider, tagSearchProviderSettings) ✅

## Re-render Triggers
- `useTagGroups()` — re-renders on tag group store changes.
- `useTagSearch(searchProviderId)` — manages search value + results, re-renders on each keystroke.
- `useTagSearchProvider()` — re-renders on settings changes.
- Prop changes: `value`, `onChange`.

## Store Subscriptions
- Tag group entity store.
- Settings store (via `useTagSearchProvider`).
- Tag search hook (manages local search state).

## Potential Issues
- **⚠️ `tagGroupOptions` creates `JSON.stringify(groupData)` for EVERY tag group on EVERY re-render where deps change** — serializes TagGroupDto objects. With 20 tag groups, that's 20 JSON.stringify calls. The `containsAllTagsInGroup` function also runs per group.
- **`tagGroupOptions` depends on `value`** — every time tags change, all tag group options are recomputed (to update `disabled` state for groups where all tags are already selected).
- **`renderOption` parses JSON** — `JSON.parse(optionValue.slice(...))` runs every time a tag group option is rendered in the dropdown.

## Recommendations
- Consider a lighter serialization format for tag group labels (e.g., ID-based lookup instead of JSON in label string).
- The current approach works but is somewhat heavy. Medium priority since tag groups are typically few.

---
*Status*: Analyzed
