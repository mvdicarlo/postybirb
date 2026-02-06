# Performance Analysis

**Source**: `components/sections/accounts-section/context/accounts-context.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/context/accounts-context.tsx`

## Overview
React context for accounts section (93 lines). Provides `selectedAccountId`, `onSelectAccount`, `onDeleteAccount`, `onResetAccount`, `onLoginRequest`, `onAccountCreated` via context. `useMemo` wraps the value.

## Memoization Usage
- [x] useMemo — context value object (keyed on all 6 props) ✅

## Re-render Triggers
- Only when any of the 6 memoized props change.

## Store Subscriptions
None directly — receives props from parent.

## Potential Issues
- **Context value depends on 6 callback props** — if parent doesn't memoize these callbacks, the useMemo's deps change every render, causing all context consumers to re-render. This is the root cause of cascading re-renders noted in `accounts-section.tsx` analysis.

## Recommendations
- Ensure parent (`AccountsSection`) memoizes all callback props passed to `AccountsProvider`.

---
*Status*: Analyzed
