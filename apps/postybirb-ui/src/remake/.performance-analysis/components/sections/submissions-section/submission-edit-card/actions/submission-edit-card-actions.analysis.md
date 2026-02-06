# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/actions/submission-edit-card-actions.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/actions/submission-edit-card-actions.tsx`

## Overview
Action buttons for submission edit card header (~180 lines). Conditional rendering: multi-submission (template + save-to-many), archived (history + unarchive + delete), template (delete only), posting (cancel + delete), normal (template + history + post + delete).

## Memoization Usage
None — event handlers defined as plain `async` functions.

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`.
- `useDisclosure` for history drawer.
- Reads: `submission.isMultiSubmission`, `submission.isArchived`, `submission.isTemplate`, `submission.isPosting`, `submission.hasErrors`, `submission.hasWebsiteOptions`, `submission.posts`.

## Store Subscriptions
None — reads from context.

## Potential Issues
- **Event handlers not memoized** — `handlePost`, `handleCancel`, `handleDelete`, `handleUnarchive` are recreated every render. These are passed to `HoldToConfirmButton` and `ActionIcon` which don't benefit from memoization anyway.
- **`SubmissionHistoryDrawer` rendered conditionally in JSX** — creates/destroys on each visibility toggle. This is fine since it's a drawer.

## Recommendations
None — appropriate for its role as a header actions bar.

---
*Status*: Analyzed
