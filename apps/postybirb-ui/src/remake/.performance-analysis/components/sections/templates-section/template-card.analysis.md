# Performance Analysis

**Source**: `components/sections/templates-section/template-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/templates-section/template-card.tsx`

## Overview
Template card component (199 lines). Inline name editing, type badge, click-to-select, hold-to-delete. Used in a list.

## Memoization Usage
- [x] useCallback — `handleSaveName`, `handleCancelEdit`, `handleDeleteTemplate`, `handleKeyDown` ✅

## Re-render Triggers
- Props: `template`, `isSelected`, `onSelect`.
- `useState` for `isEditing`, `editedName`, `isDeleting`.
- `useEffect` syncs `editedName` with `template.name`.

## Store Subscriptions
None — pure prop-driven.

## Potential Issues
- **⚠️ MEDIUM: Not wrapped in React.memo** — every parent re-render (from template list filtering, search, or type tab change) re-renders ALL template cards, even if their props haven't changed.
- **`useEffect` syncs `editedName` with `template.name`** — causes extra render cycle when name changes externally.

## Recommendations
- **Wrap in `React.memo`** — critical for list performance with many templates.
- Ensure `onSelect` callback from parent is stable (it is — `useCallback` in parent).

---
*Status*: Analyzed
