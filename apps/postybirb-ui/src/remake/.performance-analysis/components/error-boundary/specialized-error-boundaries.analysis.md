# Performance Analysis

**Source**: `components/error-boundary/specialized-error-boundaries.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/error-boundary/specialized-error-boundaries.tsx`

## Overview
Four specialized error boundary wrappers: `PageErrorBoundary`, `FormErrorBoundary`, `ComponentErrorBoundary`, `RouteErrorBoundary`. Each wraps the base `ErrorBoundary` with appropriate `level` and `onError` handlers.

## Memoization Usage
- `formErrorFallback` — module-level constant function ✅ (stable reference, not recreated per render).

## Re-render Triggers
Pass-through — these are thin wrappers around `ErrorBoundary` which is a class component.

## Store Subscriptions
None.

## Potential Issues
- **`PageErrorBoundary` passes `onError` inline arrow function** — creates new function reference each render. Since `ErrorBoundary` is a class component with `resetOnPropsChange`, this could trigger `componentDidUpdate` re-evaluation. However, `resetOnPropsChange` only acts when `hasError` is true, so this is safe.
- **`ComponentErrorBoundary` and `RouteErrorBoundary` same pattern** — inline `onError` callbacks. Same analysis: safe because class component only checks on error.

## Recommendations
- Optionally extract `onError` callbacks to module-level constants (like `formErrorFallback` already is). Very low priority.

---
*Status*: Analyzed
