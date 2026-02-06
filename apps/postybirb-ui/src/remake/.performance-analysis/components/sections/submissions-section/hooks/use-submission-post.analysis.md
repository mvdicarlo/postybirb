# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submission-post.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submission-post.ts`

## Overview
Hook for submission posting handlers (~120 lines). Enqueue, cancel, bulk post, resume mode modal state.

## Memoization Usage
- [x] useCallback — `handlePost`, `cancelResume`, `confirmResume`, `handleCancel`, `handlePostSelected` ✅

## Re-render Triggers
- `useNavigationStore` selector for `setViewState`.
- `useSubmissionStore` selector for `recordsMap`.
- `useState` for `pendingResumeSubmissionId`.
- Prop: `viewState`.

## Store Subscriptions
- Navigation store (setViewState).
- Submission store (recordsMap).

## Potential Issues
- **`handlePost` depends on `submissionsMap`** — any submission store change recreates this callback. This is the full map subscription.
- **`handlePostSelected` depends on `viewState`** — recreated on selection change.

## Recommendations
- Use `useSubmissionStore.getState()` inside `handlePost` to avoid closing over `submissionsMap`.
- Use `useNavigationStore.getState()` inside `handlePostSelected` for stable callback.

---
*Status*: Analyzed
