# Performance Analysis

**Source**: `utils/notifications.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/utils/notifications.tsx`

## Overview
Standardized notification display functions (314 lines). Provides ~25+ functions for showing success/error/warning/info notifications via Mantine's `notifications.show()`. Each function creates consistent formatting with icons and translated messages.

## Memoization Usage
N/A — imperative functions, not hooks.

## Re-render Triggers
N/A — these are called imperatively from event handlers, not during render.

## Store Subscriptions
None.

## Potential Issues
- **JSX elements created inside each function call** — `<Trans>`, `<IconCheck>`, etc. are created fresh on each notification show. This is fine since these are one-shot UI elements, not rendered in a component tree.

## Recommendations
None — clean utility module.

---
*Status*: Analyzed
