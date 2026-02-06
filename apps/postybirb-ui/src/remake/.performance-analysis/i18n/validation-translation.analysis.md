# Performance Analysis

**Source**: `i18n/validation-translation.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/i18n/validation-translation.tsx`

## Overview
Translation map for validation messages. Maps validation message IDs to React component functions that render localized JSX using `<Trans>` and `<Plural>`. Large file (388 lines) covering all possible validation messages.

## Memoization Usage
N/A — static object of functions.

## Re-render Triggers
N/A — not a hook or component. The functions are called by components to render validation messages.

## Store Subscriptions
None.

## Potential Issues
- **Each function creates new JSX on every call** — these are called from validation display components. Since they return new JSX elements each time, the parent component determines re-render behavior. This is standard React pattern.
- **Large object** — 388 lines of translation functions loaded at import time. Not a runtime concern but affects bundle size.

## Recommendations
None — standard pattern for localized message rendering.

---
*Status*: Analyzed
