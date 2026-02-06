# Performance Analysis

**Source**: `components/sections/submissions-section/submissions-content.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submissions-content.tsx`

## Overview
Primary content area for submissions view (~200 lines). Shows SubmissionEditCard for selected submissions, or empty state. Supports single/multi selection and mass edit mode.

## Memoization Usage
- [x] useMemo — `selectedIds`/`mode` extraction from viewState ✅
- [x] useMemo — `selectedSubmissions` (maps IDs to records from submissionsMap) ✅
- [x] useMemo — `multiSubmission` (finds multi-edit submission) ✅
- [x] useMemo — `hasArchived` ✅

## Re-render Triggers
- `useSubmissionsMap()` — full submissions map.
- `useSubmissionsByType(submissionType)` — all submissions of type.
- `useSubNavVisible()` — section panel visibility.
- `useToggleSectionPanel()` — toggle action.
- `useSubmissionsContentPreferences()` — preferMultiEdit.
- Prop: `viewState`.

## Store Subscriptions
- Submission entity store (full map + by-type).
- Submissions UI store (panel visibility, content preferences).

## Potential Issues
- **⚠️ MEDIUM: `useSubmissionsMap()` subscribes to entire map** — any submission change (not just selected) triggers re-render and `selectedSubmissions` recomputation.
- **`useSubmissionsByType` also subscribes** — overlapping data with the map.
- **`SubmissionsContentHeader` is an inline sub-component** — has its own store subscriptions but re-renders with parent anyway.

## Recommendations
- Use a more targeted selector instead of `useSubmissionsMap()` — ideally a selector that takes an array of IDs.
- Extract `SubmissionsContentHeader` to its own file with `React.memo`.

---
*Status*: Analyzed
