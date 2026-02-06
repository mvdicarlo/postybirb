# Performance Analysis

**Source**: `stores/records/base-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/base-record.ts`

## Overview
Abstract base class for all entity records. Provides `id`, `createdAt`, `updatedAt` properties and `matches()` / `isNewerThan()` utility methods.

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

## Re-render Triggers
N/A — plain class, not a hook or component.

## Store Subscriptions
None.

## Potential Issues
- **`new Date()` in constructor** — creates Date objects from string DTOs. This is fine since records are only created on data load / websocket update, not per-render.

## Recommendations
None — clean, minimal base class.

---
*Status*: Analyzed
