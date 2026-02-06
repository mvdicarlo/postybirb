# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/submission-edit-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/submission-edit-card.tsx`

## Overview
Collapsible card for editing a single submission (~90 lines). Wraps inner content in SubmissionEditCardProvider context. Has collapsible/non-collapsible modes.

## Memoization Usage
None explicitly — relies on context provider's `useMemo`.

## Re-render Triggers
- Props: `submission`, `isCollapsible`, `defaultExpanded`, `targetSubmissionIds`.
- `useDisclosure` for expand/collapse toggle.
- Context: `useSubmissionEditCardContext()` for `isCollapsible`, `defaultExpanded`.

## Store Subscriptions
None directly — receives submission as prop.

## Potential Issues
- **SubmissionEditCardInner re-renders when context changes** — context value includes `submission`, so any submission prop change triggers inner re-render. This is expected.
- **No `React.memo` on outer `SubmissionEditCard`** — if parent re-renders with same submission reference, this re-renders unnecessarily.

## Recommendations
- Consider `React.memo` on `SubmissionEditCard` with custom comparison on `submission.id` + relevant fields.
- Low priority — typically only 1-3 cards visible at once.

---
*Status*: Analyzed
