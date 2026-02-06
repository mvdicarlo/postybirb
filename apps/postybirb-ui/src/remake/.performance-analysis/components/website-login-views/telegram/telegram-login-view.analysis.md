# Performance Analysis

**Source**: `components/website-login-views/telegram/telegram-login-view.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/website-login-views/telegram/telegram-login-view.tsx`

## Overview
Telegram 2-phase login (196 lines). Phase 1: app ID + hash + phone number → send code. Phase 2: code + optional 2FA password → authenticate. Uses `websitesApi.performOAuthStep`.

## Memoization Usage
None — local state form.

## Re-render Triggers
- `useState` for `phoneNumber`, `appHash`, `appId`, `code`, `displayCodeDialog`, `password`, `passwordRequired`, `passwordInvalid`, `codeInvalid`, `isSendingCode`, `isAuthenticating`.
- 11 state variables — highest among login views, but sequential flow.

## Store Subscriptions
None.

## Potential Issues
- **`setImmediate(submit)` recursive call** — if `passwordRequired` is set and password is empty, `submit()` will be called again immediately. Could cause a tight loop if the API returns `passwordRequired: true` repeatedly. Functional concern.
- **11 separate `useState` calls** — could be consolidated with `useReducer` for cleaner state management. Minor perf impact (multiple state updates in event handlers are batched in React 18).

## Recommendations
- Consider `useReducer` to consolidate the many state variables.
- Guard against `setImmediate(submit)` infinite loop.

---
*Status*: Analyzed
