# Performance Analysis

**Source**: `api/post-queue.api.ts`
**Full Path**: `apps/postybirb-ui/src/remake/api/post-queue.api.ts`

## Overview
Post queue API extending BaseApi. Adds `enqueue`, `dequeue`, `getAll`, `isPaused`, `pause`, `resume` methods.

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

## Re-render Triggers
N/A — pure class, no React.

## Store Subscriptions
None.

## Potential Issues
None — stateless API singleton, no performance concerns.

## Recommendations
None.

---
*Status*: Analyzed
