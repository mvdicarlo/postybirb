# Performance Analysis

**Source**: `components/shared/copy-to-clipboard/copy-to-clipboard.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/copy-to-clipboard/copy-to-clipboard.tsx`

## Overview
Copy to clipboard component with icon (ActionIcon) and button variants. Uses Mantine's `CopyButton` render prop for copied state management.

## Memoization Usage
None — no hooks used. Pure presentational.

## Re-render Triggers
- Mantine's `CopyButton` manages internal `copied` state and re-renders the render prop children when state changes.
- Prop changes from parent.

## Store Subscriptions
None.

## Potential Issues
None — lightweight presentational component.

## Recommendations
None.

---
*Status*: Analyzed
