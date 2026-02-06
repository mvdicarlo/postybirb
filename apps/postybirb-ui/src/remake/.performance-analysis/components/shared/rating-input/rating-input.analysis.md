# Performance Analysis

**Source**: `components/shared/rating-input/rating-input.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/rating-input/rating-input.tsx`

## Overview
4-level rating input (160 lines). Maps SubmissionRating enum to numeric values 1-4 with custom icons (General, Mature, Adult, Extreme). Uses Mantine `Rating` with `highlightSelectedOnly`.

## Memoization Usage
- [x] useCallback — `handleChange` (keyed on value, onChange) ✅
- [x] useCallback — `getSymbol` (keyed on size, numericValue) ✅

## Re-render Triggers
- `useLingui()` — re-renders on locale change (for `ratingLabels`).
- Prop changes: `value`, `onChange`.

## Store Subscriptions
None.

## Potential Issues
- **`ratingLabels` object recreated every render** — `{ 1: t\`General\`, ... }` creates a new object with 4 translation lookups each render. Could be memoized with `useMemo` keyed on locale.
- **`getIconStyle` creates new objects per call** — called inside `getSymbol` callback for each icon. Creates 4 style objects per render. Minor.

## Recommendations
- Memoize `ratingLabels` with `useMemo`. Low priority — 4 entries is trivial.
- Overall clean component.

---
*Status*: Analyzed
