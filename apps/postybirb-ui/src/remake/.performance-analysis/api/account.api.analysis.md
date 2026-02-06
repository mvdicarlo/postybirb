# Performance Analysis

**Source**: `api/account.api.ts`
**Full Path**: `apps/postybirb-ui/src/remake/api/account.api.ts`

## Overview
Account API singleton extending BaseApi. Adds `clear`, `setWebsiteData`, `refreshLogin` methods. Exported as singleton instance.

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
