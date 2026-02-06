# Performance Analysis

**Source**: `components/website-login-views/helpers.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/website-login-views/helpers.tsx`

## Overview
Utility functions for login view notifications (91 lines): `notifyInfo`, `notifyLoginSuccess`, `notifyLoginFailed`, `notifyLoginError`, `notifyLoginHttpErrorHandler`. All fire Mantine `notifications.show()`. `notifyLoginSuccess` also calls `accountApi.refreshLogin`.

## Memoization Usage
N/A — pure utility functions.

## Re-render Triggers
N/A.

## Store Subscriptions
None.

## Potential Issues
None.

## Recommendations
None.

---
*Status*: Analyzed
