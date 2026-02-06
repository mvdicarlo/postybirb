# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/submission-title.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/submission-title.tsx`

## Overview
Editable title component (~90 lines). Shows as text, becomes TextInput on click. Saves on blur/Enter.

## Memoization Usage
- [x] useCallback — `handleClick`, `handleBlur`, `handleKeyDown` ✅

## Re-render Triggers
- `useState` for `localTitle`, `isEditing`.
- `useEffect` syncs `localTitle` with `title` prop.
- Props: `title`, `name`, `onTitleChange`, `readOnly`.

## Store Subscriptions
None.

## Potential Issues
- **`useEffect` syncs localTitle** — extra render when title prop changes. Standard pattern.

## Recommendations
- Wrap in `React.memo` — used in every card.

---
*Status*: Analyzed
