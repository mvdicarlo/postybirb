# Performance Analysis

**Source**: `components/sections/home-section/queue-control-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/queue-control-card.tsx`

## Overview
Queue pause/resume toggle card (56 lines). Simple button that calls postQueueApi.

## Memoization Usage
None.

## Re-render Triggers
- `useQueuePaused()` — queue pause state from settings store.
- `useState` for `isLoading`.

## Store Subscriptions
- Settings entity store (queue paused only).

## Potential Issues
None — simple component, targeted subscription.

## Recommendations
None.

---
*Status*: Analyzed
