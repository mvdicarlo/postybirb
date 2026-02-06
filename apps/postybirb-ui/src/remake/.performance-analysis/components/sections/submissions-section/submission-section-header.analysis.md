# Performance Analysis

**Source**: `components/sections/submissions-section/submission-section-header.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-section-header.tsx`

## Overview
Sticky header for submissions section panel (~300 lines). Select-all checkbox, create button, search, filter segmented control, view mode toggle, bulk action buttons (template/schedule/post/delete), file dropzone, template picker modal, multi-scheduler modal.

## Memoization Usage
- [x] useCallback — `handleCreateMessage`, `handleKeyDown` ✅

## Re-render Triggers
- `useSubmissionsFilter(submissionType)` — filter/search state.
- `useSubmissionViewMode()` — compact/detailed view mode.
- `useLingui()` — locale.
- `useState` for `popoverOpened`, `messageTitle`, `isTemplateModalOpen`, `isSchedulerModalOpen`.
- Props: `selectionState`, `selectedCount`, `selectedIds`, `selectedSubmissions`, `totalCount`, etc.

## Store Subscriptions
- Submissions UI store (filter/search).
- Appearance store (view mode).

## Potential Issues
- **Large prop surface from parent** — receives many props from SubmissionsSection, any change triggers re-render.
- **Inline arrow functions for `onFileDrop` prop** — `(files) => { setInitialFiles(files); openFileModal(); }` creates new reference every parent render.
- **Template picker and multi-scheduler modals rendered inline** — only when their state is true, which is correct.

## Recommendations
- Wrap in `React.memo` to avoid re-renders when only submission list changes but header props are the same.
- Memoize `onFileDrop` in parent.

---
*Status*: Analyzed
