# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/submission-quick-edit-actions.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/submission-quick-edit-actions.tsx`

## Overview
Inline quick-edit controls (~100 lines). Rating selector and debounced tag input. Contains `QuickEditTags` sub-component.

## Memoization Usage
- [x] useCallback — `handleTagsChange`, `handleRatingChange` ✅
- In QuickEditTags:
  - [x] useCallback — `handleChange`, `handleBlur` ✅
  - [x] useDebouncedCallback — saves tags after 500ms ✅

## Re-render Triggers
- `useSubmissionActions(submission.id)` — bound handlers from context.
- Prop: `submission`.
- QuickEditTags: `useState` for `localTags`, `useEffect` sync, `useRef` for `hasChanges`.

## Store Subscriptions
- Submissions context (via `useSubmissionActions`).

## Potential Issues
- **`QuickEditTags` defined as inline sub-component** — re-mounts on parent re-render since it's defined inside the same file (but as a named function, so React reconciles it correctly).
- **`useDebouncedCallback` with 500ms delay** — good pattern for preventing rapid API calls.

## Recommendations
- Wrap `SubmissionQuickEditActions` in `React.memo`.

---
*Status*: Analyzed
