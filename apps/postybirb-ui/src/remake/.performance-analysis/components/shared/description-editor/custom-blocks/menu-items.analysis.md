# Performance Analysis

**Source**: `components/shared/description-editor/custom-blocks/menu-items.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/description-editor/custom-blocks/menu-items.tsx`

## Overview
Utility functions for BlockNote suggestion menus (99 lines): `getCustomSlashMenuItems` (filters default items), `filterShortcutMenuItems` (query filter), `getDefaultShortcutMenuItem` (Default block inserter), `filterSuggestionItems` (duplicate of filter-suggestion-item.tsx).

## Memoization Usage
N/A — pure utility functions.

## Re-render Triggers
N/A — called by editor components, not a React component.

## Store Subscriptions
None.

## Potential Issues
- `filterSuggestionItems` is duplicated in `filter-suggestion-item.tsx`.

## Recommendations
Deduplicate the filter function.

---
*Status*: Analyzed
