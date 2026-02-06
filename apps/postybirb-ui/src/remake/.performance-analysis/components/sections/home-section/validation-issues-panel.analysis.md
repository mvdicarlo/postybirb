# Performance Analysis

**Source**: `components/sections/home-section/validation-issues-panel.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/validation-issues-panel.tsx`

## Overview
Validation issues panel (140 lines). Shows up to 5 submissions with errors/warnings, with error/warning counts. Clickable to navigate.

## Memoization Usage
- [x] useMemo — `issues` (filters non-template/non-archived, maps to error/warning counts, slices to 5) ✅
- [x] useCallback — `handleNavigateToSubmission` ✅

## Re-render Triggers
- `useSubmissionsWithErrors()` — submissions with validation errors.
- `useViewStateActions()` — setViewState.

## Store Subscriptions
- Submission entity store (filtered to those with errors).
- Navigation store (actions).

## Potential Issues
- **`totalErrors` and `totalWarnings` computed inline** — `.reduce()` runs on every render. Should be memoized or derived from `issues`.

## Recommendations
- Memoize `totalErrors` and `totalWarnings` or compute inside the `issues` useMemo.
- Wrap in `React.memo`.

---
*Status*: Analyzed
