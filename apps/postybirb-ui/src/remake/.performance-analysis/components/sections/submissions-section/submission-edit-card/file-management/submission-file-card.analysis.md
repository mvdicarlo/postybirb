# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/file-management/submission-file-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/file-management/submission-file-card.tsx`

## Overview
Individual file card (~170 lines). Preview, metadata, drag handle, expandable metadata section.

## Memoization Usage
- [x] useMemo — `accounts` (maps submission options to IAccountDto[]) ✅

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`.
- Props: `file`, `draggable`, `totalFiles`.
- `useDisclosure` for expand/collapse.
- Store: `useAccountsMap()` — **full accounts map subscription**.

## Store Subscriptions
- `useAccountsMap()` — subscribes to full accounts map. Any account change triggers re-render.

## Potential Issues
- **⚠️ `useAccountsMap()` subscribes to full map** — every SubmissionFileCard re-renders when any account changes. With multiple files, this multiplies.
- **`accounts` useMemo depends on `[submission.options, accountsMap]`** — both change frequently. The memo helps but the subscription is still broad.
- **Not wrapped in `React.memo`** — parent re-renders (from SortableJS recreation) propagate to all file cards.

## Recommendations
- **MEDIUM**: Wrap in `React.memo` with shallow comparison on `file.id`, `file.hash`.
- Consider moving account resolution to the parent and passing as props to avoid per-card store subscription.

---
*Status*: Analyzed
