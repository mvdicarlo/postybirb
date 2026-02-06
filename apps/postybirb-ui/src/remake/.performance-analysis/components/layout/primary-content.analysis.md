# Performance Analysis

**Source**: `components/layout/primary-content.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/layout/primary-content.tsx`

## Overview
Main content area that renders view-specific content based on `viewState`. Switch-like routing: HomeContent, AccountsContent, SubmissionsContent (file/message), TemplatesContent. Wrapped in `ComponentErrorBoundary`.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used on `ViewContent`

## Re-render Triggers
- `viewState` prop from parent (`Layout`).
- `loading` prop.

## Store Subscriptions
None directly — receives viewState as a prop.

## Potential Issues
- **`ViewContent` inner component re-created on every `PrimaryContent` render** — since `ViewContent` is defined inside the module (not inside `PrimaryContent`), this is actually fine ✅. The function reference is stable.
- **ContentNavbar is commented out** — no pagination currently rendered.

## Recommendations
- Could memoize `ViewContent` with `React.memo` to avoid re-rendering when `viewState` reference changes but `type` hasn't changed. Low priority since the switch is cheap.

---
*Status*: Analyzed
