# Performance Analysis

**Source**: `stores/entity/submission-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/submission-store.ts`

## Overview
Zustand entity store for submissions — the most subscribed-to store in the app. Uses `createEntityStore` directly. Provides many filtered selector hooks: `useSubmissions`, `useSubmissionsByType`, `useRegularSubmissions`, `useTemplateSubmissions`, `useScheduledSubmissions`, `useArchivedSubmissions`, `useQueuedSubmissions`, `useSubmissionsWithErrors`.

## Memoization Usage
- [x] useShallow — used in most selectors (`useSubmissionsByType`, `useRegularSubmissions`, `useTemplateSubmissions`, `useScheduledSubmissions`, `useArchivedSubmissions`, `useQueuedSubmissions`, `useSubmissionsWithErrors`, `useSubmissionsLoading`, `useSubmissionActions`)
- [ ] useShallow — **NOT** used in `useSubmissions` (raw array), `useSubmissionsMap`, `useSubmission(id)`

## Re-render Triggers
- **This is the highest-frequency update store** — submissions change often (editing, validation, queue status changes).
- **`useSubmissions`**: no `useShallow` — re-renders on EVERY store update.
- **`useSubmission(id)`**: returns `recordsMap.get(id)` — new reference on every websocket update even if that specific submission didn't change.
- **All filter hooks** (`useRegularSubmissions`, etc.): filter + `useShallow` comparison runs on every store update. With many submissions, this is O(n) filtering + O(n) shallow comparison on every update.

## Store Subscriptions
- Subscribes to `SUBMISSION_UPDATES` websocket events.

## Potential Issues
- **⚠️ CRITICAL: `useSubmissions` has no `useShallow`** — every component using this (likely submission lists) re-renders on every submission store change.
- **⚠️ HIGH: Multiple filter hooks all run independently** — if a component uses both `useRegularSubmissions()` and `useScheduledSubmissions()`, both filters + shallow comparisons run on every single store update. With 100+ submissions, that's 200+ comparisons per update per such component.
- **⚠️ HIGH: `useSubmission(id)` instability** — components displaying individual submission cards that use this hook re-render on every store update, not just when their specific submission changes.
- **`useSubmissionsMap` has no `useShallow`** — same issue as account store.

## Recommendations
- **Add `useShallow` to `useSubmissions`** — immediate quick win.
- **Implement record-level diffing upstream** — this is the single biggest performance improvement possible. If unchanged SubmissionRecord references are preserved, all `useShallow` comparisons become no-ops for unchanged data.
- **Consider derived/computed selectors** — use Zustand's `subscribeWithSelector` middleware or a memoized selector pattern so filters only re-compute when the source array reference actually changes.
- **For `useSubmission(id)`** — implement a per-ID selector that only re-renders when that specific record's reference changes.

---
*Status*: Analyzed
