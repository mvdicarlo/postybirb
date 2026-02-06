# Performance Analysis

**Source**: `components/error-boundary/error-boundary.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/error-boundary/error-boundary.tsx`

## Overview
Class-based React error boundary (331 lines). Contains `CopyableErrorDetails` sub-component for error display with copy-to-clipboard, and the main `ErrorBoundary` class with `getDerivedStateFromError`, `componentDidCatch`, `resetErrorBoundary`, and level-based fallback rendering (page/section/component).

## Memoization Usage
N/A — class component, no hooks.

## Re-render Triggers
- `ErrorBoundary` only re-renders when:
  - An error is caught (`getDerivedStateFromError` sets `hasError: true`)
  - `resetKeys` prop changes (triggers `resetErrorBoundary`)
  - `resetOnPropsChange` is true and any prop changes
- `CopyableErrorDetails` — function component, no hooks, re-renders only when parent re-renders.

## Store Subscriptions
None.

## Potential Issues
- **`getComponentName` defined inline in both `CopyableErrorDetails` AND `componentDidCatch`** — duplicated function. Not a perf issue but code duplication.
- **`resetErrorBoundary` uses `setTimeout(100)`** — minor delay. The timeout ID is stored on the instance and cleared on re-entry, which is correct.
- **`CopyableErrorDetails` builds `errorDetails` string on every render** — only matters in error state, so negligible.

## Recommendations
- Extract `getComponentName` to a shared utility. Low priority — error paths only.
- No performance concerns for normal operation (error boundaries are pass-through when no error).

---
*Status*: Analyzed
