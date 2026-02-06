# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/account-option-row.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/account-option-row.tsx`

## Overview
Single account checkbox row (~120 lines). Toggles website option creation/removal via API. Expands to show FormFieldsProvider + SectionLayout when selected.

## Memoization Usage
- [x] useCallback — `handleToggle` ✅

## Re-render Triggers
- Props: `account`, `websiteOption`, `hasErrors`, `hasWarnings`.
- Context: `useSubmissionEditCardContext()` — `submission`.
- `useState` for `isLoading`, `manualExpanded`.
- `useEffect` resets `manualExpanded` when `websiteOption` changes.

## Store Subscriptions
None directly — data via props and context.

## Potential Issues
- **Not wrapped in `React.memo`** — all rows re-render when parent's `optionsByAccount` or `validationsByOptionId` maps change. With 20+ accounts, this multiplies.
- **`handleToggle` has eslint-disable for exhaustive deps** — `submission.options` not in deps. Accesses `submission.options` inside to find defaultOption. Stale closure risk for rating.

## Recommendations
- **MEDIUM**: Wrap in `React.memo` with custom comparison on `account.id`, `websiteOption?.id`, `hasErrors`, `hasWarnings`.

---
*Status*: Analyzed
