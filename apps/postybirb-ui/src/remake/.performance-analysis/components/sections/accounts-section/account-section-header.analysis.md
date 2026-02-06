# Performance Analysis

**Source**: `components/sections/accounts-section/account-section-header.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/account-section-header.tsx`

## Overview
Sticky header for accounts section (66 lines). Contains search input, login filter SegmentedControl, and WebsiteVisibilityPicker.

## Memoization Usage
None.

## Re-render Triggers
- `useAccountsFilter()` — searchQuery, loginFilter, setSearchQuery, setLoginFilter.
- `useLingui()` — locale.

## Store Subscriptions
- Accounts UI store (filter state).

## Potential Issues
None — simple header, re-renders only on filter/search changes.

## Recommendations
None.

---
*Status*: Analyzed
