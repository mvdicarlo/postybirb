# Performance Analysis

**Source**: `components/website-login-views/index.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/website-login-views/index.ts`

## Overview
Registry file (68 lines). Imports all login view components and exports `loginViewRegistry` map, `getLoginViewComponent()`, `hasLoginViewComponent()`, plus re-exports of helpers, types, and `LoginViewContainer`.

## Memoization Usage
N/A — module-level registry.

## Re-render Triggers
N/A.

## Store Subscriptions
None.

## Potential Issues
- Registry import pulls in ALL login views at once. Consider lazy loading if bundle size is a concern.

## Recommendations
- Could use `React.lazy()` for code-splitting login views. Low priority since they are small.

---
*Status*: Analyzed
