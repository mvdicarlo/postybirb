# Performance Analysis

**Source**: `components/sections/home-section/stat-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/stat-card.tsx`

## Overview
Reusable stat card for dashboard metrics (72 lines). Shows icon, count, label. Optionally clickable.

## Memoization Usage
None.

## Re-render Triggers
Prop changes: `icon`, `count`, `label`, `color`, `onClick`.

## Store Subscriptions
None — pure presentational.

## Potential Issues
None.

## Recommendations
- Could wrap in `React.memo` since it's used 4 times in HomeContent and parent re-renders frequently.

---
*Status*: Analyzed
