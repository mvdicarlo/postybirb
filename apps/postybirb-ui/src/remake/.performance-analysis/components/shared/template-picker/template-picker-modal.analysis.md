# Performance Analysis

**Source**: `components/shared/template-picker/template-picker-modal.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/template-picker/template-picker-modal.tsx`

## Overview
Complex modal for applying template options to a submission (494 lines). User selects source templates, then for each account option in the template, can choose whether to override the current submission's option. Per-account fieldsets with checkbox groups, select all/none, and merge/replace buttons.

## Memoization Usage
- [x] useMemo — `availableOptions` (finds template options across selected templates) ✅
- [x] useMemo — `selectedGroups` (groups options by account key) ✅
- [x] useCallback — `handleSelectionChange` ✅

## Re-render Triggers
- `useState` for `selectedTemplateIds`, `selectedWebsiteOptions`, `overrides`.
- `useAccounts()` — re-renders on account store changes.
- `useTemplateSubmissions()` — re-renders on template store changes.
- `useSubmissionsByType(type)` — re-renders on submission store changes (used for the target submission's options).

## Store Subscriptions
- Account entity store.
- Template submission entity store.
- Submission entity store (filtered by type).

## Potential Issues
- **⚠️ POTENTIAL STALE CLOSURE: `handleSelectionChange`** depends on `[selectedWebsiteOptions]` but `selectedWebsiteOptions` is a state variable that changes when the handler is called. Since `setSelectedWebsiteOptions` is using the value from closure (not a function updater), rapid toggling could use stale state.
- **⚠️ Three store subscriptions** — any account login, template change, or submission change triggers re-render of this complex modal.
- **`Object.values(selectedGroups).map(...)` in render** — creates new JSX tree with Checkbox.Groups per account on every render. With many accounts, this is a lot of JSX recreation.
- **`overrides` state object** — updated via spread `{ ...prev, [key]: !prev[key] }`. Each toggle creates new object. Fine for correctness, but with many overrides could cause cascading re-renders.

## Recommendations
- **Fix `handleSelectionChange` stale closure** — use functional updater: `setSelectedWebsiteOptions(prev => ...)` instead of reading from closure.
- **Consider memoizing account fieldset rendering** with a child component or `React.memo` wrapper.
- Medium priority — modal is used occasionally but is complex when open.

---
*Status*: Analyzed
