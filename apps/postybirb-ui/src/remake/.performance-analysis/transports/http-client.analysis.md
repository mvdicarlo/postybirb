# Performance Analysis

**Source**: `transports/http-client.ts`
**Full Path**: `apps/postybirb-ui/src/remake/transports/http-client.ts`

## Overview
HTTP client transport layer. Provides a `HttpClient` class wrapping `fetch` with retry logic, error handling, JSON/FormData serialization, and remote mode support. Each API module creates a singleton `HttpClient` instance.

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

No React hooks — this is a pure utility class.

## Re-render Triggers
N/A — not a React component or hook.

## Store Subscriptions
None. Reads `localStorage` directly for remote host/password configuration on each request.

## Potential Issues
- **`defaultTargetProvider()` reads `localStorage` on every request** — `localStorage.getItem` is synchronous and blocking the main thread. With high request frequency, this could add micro-delays.
- **`getRemotePassword()` also reads `localStorage` per request** — same concern, amplified since both are called together.
- **Retry with exponential backoff (default 3 retries)** — if the server is down, requests to it will take ~7+ seconds (1s + 2s + 4s) before failing, blocking UI if `await`-ed inline in handlers.
- **`buildResponse` catches parse errors silently** — failed JSON parsing returns empty object, which could cause cryptic downstream issues.

## Recommendations
- Cache `localStorage` values and only re-read on a storage event or explicit refresh to avoid per-request sync IO.
- Consider making retry count configurable per call-site (API calls from user actions should probably not retry 3 times; background refreshes can).
- No performance concern for UI rendering — this is infrastructure code.

---
*Status*: Analyzed
