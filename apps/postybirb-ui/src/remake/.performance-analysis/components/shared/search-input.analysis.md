# Performance Analysis

**Source**: `components/shared/search-input.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/search-input.tsx`

## Overview
Standardized search input component with search icon, translated placeholder, and optional clear button. Controlled component driven by `value`/`onChange` props.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used (`handleClear` defined inline)
- [ ] React.memo — not used

## Re-render Triggers
- `useLingui()` — re-renders on locale change (for translated placeholder).
- Prop changes: `value`, `onChange`.

## Store Subscriptions
None directly (i18n via `useLingui`).

## Potential Issues
- **`handleClear` not wrapped in `useCallback`** — recreated every render. Minor since it's only an onClick handler.
- **`ICON_SIZES` is module-level constant** ✅ — no render-time allocation.

## Recommendations
None significant. Clean, lightweight controlled input.

---
*Status*: Analyzed
