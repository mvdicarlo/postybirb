# Performance Analysis

**Source**: `components/sections/accounts-section/login-webview.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/login-webview.tsx`

## Overview
Electron webview wrapper for website login (238 lines). Toolbar with back/forward/refresh/check-login buttons, URL display, login status badge. Debounced login refresh on navigation, webview partition management.

## Memoization Usage
- [x] useCallback — `debouncedRefreshLogin` (debounce 500ms) ✅
- [x] useCallback — `handleCheckLogin` ✅

## Re-render Triggers
- `useAccount(accountId)` — re-renders on account state changes (login status, username).
- `useState` for `isLoading`, `currentUrl`, `resetWebview`.
- `useRef` for webviewRef, hasShownSuccessNotification, lastAccount.

## Store Subscriptions
- Account entity store (single account by ID).

## Potential Issues
- **`handleGoBack` / `handleGoForward` / `handleRefresh` are not memoized** — inline functions, but only used as onClick handlers, minor.
- **Webview recreation on account change** — necessary due to Electron partition limitation. Returns `null` briefly (resetWebview), causing unmount/remount.
- **`useEffect` for login success notification** has 5 deps including `account` object — could fire more than intended if account object reference changes without isLoggedIn changing. The `hasShownSuccessNotification` ref guards against duplicates.

## Recommendations
- Minor: could wrap `handleRefresh`, `handleGoBack`, `handleGoForward` in `useCallback` for consistency.

---
*Status*: Analyzed
