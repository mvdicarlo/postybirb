# Performance Analysis

**Source**: `components/sections/accounts-section/website-visibility-picker.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/website-visibility-picker.tsx`

## Overview
Popover with checkbox list for toggling website visibility (105 lines). Shows all websites with show/hide checkboxes.

## Memoization Usage
None.

## Re-render Triggers
- `useWebsites()` — full website store.
- `useAccountsFilter()` — hiddenWebsites, toggleWebsiteVisibility.

## Store Subscriptions
- Website entity store (all).
- Accounts UI store.

## Potential Issues
- **`websites.map(...)` in popover creates new Checkbox elements per render** — only matters when popover is open. Mantine Popover portals, so closed state doesn't render content.
- **`hiddenWebsites.includes(website.id)` is O(N) per website** — with 30 websites and 5 hidden, that's 150 comparisons. Use a Set for O(1).

## Recommendations
- Convert `hiddenWebsites` to a Set for faster lookup.
- Low priority — popover is used infrequently.

---
*Status*: Analyzed
