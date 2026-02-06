# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/schedule-form/schedule-form.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/schedule-form/schedule-form.tsx`

## Overview
Schedule editor with None/Once/Recurring tabs (~230 lines). Vertical Tabs layout with DateTimePicker and CronPicker. Uses `useLocalStorage` for persisting last used date.

## Memoization Usage
- [x] useCallback — `handleTypeChange`, `handleDateTimeChange`, `handleCronChange`, `handleToggleActive` ✅

## Re-render Triggers
- Props: `schedule`, `isScheduled`, `onChange`.
- `useState` for `internalSchedule`, `internalIsScheduled`.
- `useEffect` syncs internal state with props.
- `useLocalStorage` for `lastUsedDate`.
- `useLocale()` for `formatRelativeTime`.

## Store Subscriptions
None.

## Potential Issues
- **`useEffect` syncs internal state with props** — could cause double-render: props update → effect sets state → re-render. This is the controlled+uncontrolled hybrid antipattern.
- **`handleTypeChange` closes over `internalIsScheduled` and `lastUsedDate`** — stale closure risk if these change between user actions.
- **`Cron(DEFAULT_CRON)?.nextRun()?.toISOString()`** computed inside callback — library instantiation on every type change. Minor.

## Recommendations
- Consider removing internal state mirroring — either fully controlled (use props directly) or fully uncontrolled (useRef for initial).
- Low priority — schedule form is only rendered once per edit card.

---
*Status*: Analyzed
