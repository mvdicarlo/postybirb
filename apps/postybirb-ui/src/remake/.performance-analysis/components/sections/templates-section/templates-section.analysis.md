# Performance Analysis

**Source**: `components/sections/templates-section/templates-section.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/templates-section/templates-section.tsx`

## Overview
Templates section panel (232 lines). Search, type tabs (File/Message), create new template input, and scrollable template list.

## Memoization Usage
- [x] useCallback — `handleSelectTemplate`, `handleCreateTemplate`, `handleKeyDown` ✅
- [x] useMemo — `filteredTemplates` (filters by type and search) ✅

## Re-render Triggers
- `useTemplateSubmissions()` — all template submissions.
- `useSubmissionsLoading()` — loading state.
- `useTemplatesFilter()` — tabType, searchQuery.
- `useNavigationStore(state => state.setViewState)` — selector.
- `useLingui()` — locale.
- `useState` for `newTemplateName`, `isCreating`.

## Store Subscriptions
- Submission entity store (templates only).
- Templates UI store (filter/search).
- Navigation store (setViewState).

## Potential Issues
- No significant issues — well-memoized with targeted selectors.

## Recommendations
None.

---
*Status*: Analyzed
