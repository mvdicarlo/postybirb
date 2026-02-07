# Performance Analysis

**Source**: `stores/entity/account-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/account-store.ts`

## Overview
Zustand entity store for accounts. Uses `createEntityStore` directly (not `createTypedStore`). Provides selector hooks: `useAccounts`, `useAccountsMap`, `useAccountsLoading`, `useAccount(id)`, `useLoggedInAccounts`, `useAccountActions`. Also exports a `groupAccountsByWebsite` utility.

## Memoization Usage
- [x] useShallow — used in `useAccounts`, `useAccountsLoading`, `useLoggedInAccounts`, `useAccountActions`
- [ ] useMemo — not used (but `groupAccountsByWebsite` is a utility meant to be wrapped in `useMemo` by consumers)

## Re-render Triggers
- **`useAccounts`**: re-renders when accounts array changes (every websocket update — see create-entity-store analysis).
- **`useLoggedInAccounts`**: filters on every store update; `useShallow` then compares the filtered array. If a non-login-related field changes on any account, the filter still re-runs.
- **`useAccount(id)`**: selects from `recordsMap.get(id)` — re-renders whenever the Map reference changes (every websocket update), even if the specific account didn't change.
- **`useAccountsMap`**: no `useShallow` — re-renders on every store update since Map reference changes.

## Store Subscriptions
- Subscribes to `ACCOUNT_UPDATES` websocket events via `createEntityStore`.

## Potential Issues
- ~~**⚠️ `useAccount(id)` re-renders on any account update** — because the Map is rebuilt on every websocket event, `recordsMap.get(id)` returns a new object reference even for unchanged accounts.~~ **Fixed** — upstream `diffRecords` preserves per-record references.
- ~~**`useAccountsMap` missing `useShallow`** — every subscriber re-renders on every store update.~~ **Fixed** — `useShallow` added.
- **`useLoggedInAccounts` filters on every update** — the filter + `useShallow` comparison runs even when non-login data changes. Mitigated by upstream diffing preserving references.
- **`groupAccountsByWebsite` creates new Map and arrays on every call** — if not wrapped in `useMemo` by consumers, it reallocates on every render.

## Recommendations
- ~~Fix upstream in `create-entity-store` (record-level diffing) to make `useAccount(id)` stable.~~ **Done.**
- ~~Add `useShallow` to `useAccountsMap` or better yet, fix Map stability upstream.~~ **Done** — both applied.
- Document that `groupAccountsByWebsite` MUST be used with `useMemo`.

---
*Status*: Analyzed
