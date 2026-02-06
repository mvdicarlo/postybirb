# Performance Analysis

**Source**: `components/website-login-views/bluesky/bluesky-login-view.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/website-login-views/bluesky/bluesky-login-view.tsx`

## Overview
Bluesky login form (230 lines). Username/app-password with optional custom PDS and AppView URL fields. Validates username format with regex. Calls `websitesApi.performOAuthStep` on submit.

## Memoization Usage
None — purely local state-driven form.

## Re-render Triggers
- `useState` for `username`, `password`, `isSubmitting`, `isUsingCustomPdsOrAppView`, `customPds`, `appViewUrl`.
- Inline `onChange` handlers create new functions per render (standard form pattern).

## Store Subscriptions
None — receives `account`, `data` via props.

## Potential Issues
- **Inline `onSubmit` handler** — new function per render. Standard for forms, not a perf concern.
- **`usernameRegexp` and `safeUrlParse` are module-level** — ✅ no per-render allocation.
- **Conditional validation runs on every render** (regex test, URL parse) — cheap operations.

## Recommendations
None — clean form component with appropriate local state.

---
*Status*: Analyzed
