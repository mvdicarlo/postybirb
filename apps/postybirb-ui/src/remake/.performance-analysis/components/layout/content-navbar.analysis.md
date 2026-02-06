# Performance Analysis

**Source**: `components/layout/content-navbar.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/layout/content-navbar.tsx`

## Overview
Content area navbar with title, centered pagination, and right-aligned action buttons. Pure presentational component driven entirely by props.

## Memoization Usage
None — no hooks used.

## Re-render Triggers
Prop changes only (no hooks, no state, no store subscriptions).

## Store Subscriptions
None.

## Potential Issues
- **Currently appears to be commented out** in `PrimaryContent` (`{/* <ContentNavbar ... /> */}`). Not actively rendered.

## Recommendations
None — clean presentational component. When re-enabled, consider `React.memo` if parent re-renders frequently.

---
*Status*: Analyzed
