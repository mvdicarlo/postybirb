# Performance Analysis

**Source**: `components/sections/templates-section/templates-content.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/templates-section/templates-content.tsx`

## Overview
Templates content area (127 lines). Shows template editor (reuses `SubmissionEditCard`) when a template is selected, or empty state. Contains `TemplatesContentHeader` sub-component.

## Memoization Usage
- [x] useMemo — `selectedTemplate` (lookup from submissionsMap) ✅

## Re-render Triggers
- `useSubmissionsMap()` — full submissions map.
- `useSubNavVisible()` — section panel visibility.
- `useToggleSectionPanel()` — toggle action.
- Prop: `viewState`.

## Store Subscriptions
- Submission entity store (full map).
- Submissions UI store (panel visibility).

## Potential Issues
- **`useSubmissionsMap()` subscribes to the entire map** — any submission change (not just templates) triggers re-render. Should use a more targeted selector.
- **`TemplatesContentHeader` defined inline** — re-renders with parent unnecessarily.

## Recommendations
- Use a targeted selector for just the selected template instead of the full map.
- Extract `TemplatesContentHeader` to its own file or wrap in `React.memo`.

---
*Status*: Analyzed
