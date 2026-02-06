# Performance Analysis

**Source**: `components/sections/submissions-section/submissions-section.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submissions-section.tsx`

## Overview
Main section panel for submissions (~250 lines). Orchestrates the entire submissions list: tabs (active/archived), global dropzone, selection, bulk actions, modals (delete confirm, post confirm, file upload, resume mode), and history drawer.

## Memoization Usage
- [x] useCallback — `handleDeleteWithConfirm`, `handlePostWithConfirm`, `handleViewHistory`, `handleCloseHistory` ✅
- [x] useMemo — `selectedSubmissions` (maps selectedIds to records) ✅

## Re-render Triggers
- `useSubmissionsLoading()` — loading state.
- `useSubmissions({ submissionType })` — all/ordered/filtered submissions.
- `useSubmissionSelection()` — selectedIds, selectionState.
- `useSubmissionHandlers()` — all action handlers.
- `useGlobalDropzone()` — dropzone state.
- Multiple `useState` / `useDisclosure` for modals and tabs.
- `useLingui()` — locale.

## Store Subscriptions
- Submission entity store (by type, via `useSubmissions` and `useSubmissionsLoading`).
- Navigation store (via `useSubmissionSelection` and `useSubmissionHandlers`).
- Submissions UI store (via `useSubmissions` for filter/search).

## Potential Issues
- **⚠️ HIGH: This is the coordination hub** — it composes 4+ hooks that each have their own subscriptions. Any submission change cascades through `useSubmissions` → `useSubmissionSelection` → `selectedSubmissions` memo → child re-render.
- **`selectedSubmissions` useMemo filters on every selectedIds or orderedSubmissions change** — orderedSubmissions changes whenever any submission changes.
- **tinykeys `useEffect` registers global keydown** — recreates on `selectedIds.length` change.
- **`SubmissionsProvider` value depends on many handler refs** — handlers from `useSubmissionHandlers` are stable (`useCallback`), but `selectedIds` reference changes on every selection change, triggering all context consumers.

## Recommendations
- Consider splitting modal management into a separate hook to reduce this component's re-render surface.
- The `SubmissionsProvider` value should be split: data (selectedIds, isDragEnabled) in one context, actions in another — actions are stable but data changes often, causing all context consumers to re-render.

---
*Status*: Analyzed
