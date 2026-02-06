# Performance Analysis

**Source**: `hooks/use-locale.ts`
**Full Path**: `apps/postybirb-ui/src/remake/hooks/use-locale.ts`

## Overview
Centralized locale-aware formatting hook. Returns current locale, mapped locale codes for various libraries (date, calendar, cronstrue, BlockNote), and formatting functions (`formatRelativeTime`, `formatDateTime`, `formatDate`, `formatTime`).

## Memoization Usage
- [x] useMemo — memoizes all 4 formatting functions, keyed on `[locale, dateLocale]`. ✅ Good usage.

## Re-render Triggers
- **`useLingui()`** — subscribes to lingui i18n context. Re-renders when locale changes.
- The locale mapping lookups (object property access) are trivial.

## Store Subscriptions
None directly (uses lingui context, not Zustand).

## Potential Issues
- **`moment.locale(dateLocale)` called inside `useMemo`** — this sets the GLOBAL moment locale as a side effect inside a memoized computation. This is generally an anti-pattern (`useMemo` should be pure), but it's necessary here for `moment.fromNow()` to use the right locale.
- **Formatting functions create new `Date` objects** from strings on every call — minor, expected behavior.

## Recommendations
- Move `moment.locale()` call to a `useEffect` instead of inside `useMemo` for correctness (side effects in `useMemo` can cause issues with React strict mode / concurrent features).
- Otherwise well-structured — `useMemo` on `[locale, dateLocale]` is appropriate since locale changes are rare.

---
*Status*: Analyzed
