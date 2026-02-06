# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/account-selection-form.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/account-selection-form.tsx`

## Overview
Account selection form (~220 lines). Groups accounts by website. Select all/deselect all. Contains WebsiteAccountGroup sub-component.

## Memoization Usage
- [x] useMemo — `optionsByAccount`, `validationsByOptionId`, `accountsByWebsite`, `websites`, `eligibleAccounts`, `unselectedAccounts` (6 total) ✅
- [x] useCallback — `getDefaultRating`, `handleSelectAll`, `handleDeselectAll` ✅

WebsiteAccountGroup:
- [x] useMemo — `selectedCount`, `loggedInCount`, `{ errorCount, warningCount }` ✅

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`.
- Stores: `useAccounts()`, `useFileWebsites()`, `useMessageWebsites()`.
- `useState` for `isSelectingAll`, `isDeselectingAll`.

## Store Subscriptions
- **`useAccounts()`** — full account list. Any account add/remove/update triggers re-render.
- **`useFileWebsites()` / `useMessageWebsites()`** — website lists.

## Potential Issues
- **⚠️ 3 store subscriptions + context** — any account, website, or submission change triggers full re-render of the entire account selection tree.
- **`handleSelectAll` fires parallel `Promise.all` API calls** — one per unselected account. With 20 accounts, this is 20 simultaneous API calls.
- **6 `useMemo` hooks with overlapping deps** — `submission.options` change cascades through `optionsByAccount` → `unselectedAccounts` → `handleSelectAll`.

## Recommendations
- **MEDIUM**: Consider `React.memo` on `WebsiteAccountGroup` with custom comparison.
- Batch the select-all API calls into a single endpoint instead of N parallel calls.

---
*Status*: Analyzed
