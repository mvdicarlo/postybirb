# Performance Analysis

**Source**: `api/directory-watchers.api.ts`
**Full Path**: `apps/postybirb-ui/src/remake/api/directory-watchers.api.ts`

## Overview
Directory watchers API singleton extending BaseApi. Adds `checkPath` method. Exports `FILE_COUNT_WARNING_THRESHOLD` constant.

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
