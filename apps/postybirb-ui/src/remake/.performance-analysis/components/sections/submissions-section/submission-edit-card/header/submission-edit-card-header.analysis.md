# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/header/submission-edit-card-header.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/header/submission-edit-card-header.tsx`

## Overview
Header for submission edit card (~50 lines). Shows chevron, title text, archived/multi-edit badges.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`, `isCollapsible`.
- Props: `isExpanded`.

## Store Subscriptions
None.

## Potential Issues
None — lightweight render-only component.

## Recommendations
None.

---
*Status*: Analyzed
