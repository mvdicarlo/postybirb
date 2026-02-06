# Performance Analysis

**Source**: `components/sections/accounts-section/accounts-section.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/accounts-section.tsx`

## Overview
Accounts section panel (229 lines). Displays a scrollable list of websites with their accounts, filtered by search query, login status, and visibility. Wraps children in `AccountsProvider` context.

## Memoization Usage
- [x] useMemo — `accountsByWebsite` (groups accounts by website) ✅
- [x] useMemo — `filteredWebsites` (applies visibility, search, login filter) ✅
- [x] useMemo — `sortedWebsites` (sorts by has-accounts-first, then alphabetical) ✅

## Re-render Triggers
- `useWebsites()` — full website store.
- `useAccounts()` — full account store.
- `useWebsitesLoading()` — loading state.
- `useAccountsLoading()` — loading state.
- `useAccountsFilter()` — search, login filter, hidden websites.
- `useNavigationStore(state => state.setViewState)` — selector returns stable function.

## Store Subscriptions
- Website entity store (all).
- Account entity store (all).
- Accounts UI store (filter/search).
- Navigation store (setViewState only).

## Potential Issues
- **⚠️ MEDIUM: `getFilteredAccounts` is a plain function** called in render for each website. Not memoized — recomputes on every render. With 20 websites, does 20 filter operations per render.
- **⚠️ `handleDeleteAccount` and `handleResetAccount` are not memoized** — passed to AccountsProvider context. Creates new function refs on every render, causing context value to change and all consumers to re-render.
- **Full `useAccounts()` and `useWebsites()` subscriptions** — any account or website change re-renders this entire component.

## Recommendations
- **Wrap `handleDeleteAccount`, `handleResetAccount`, `handleSelectAccount`** in `useCallback`.
- **Memoize `getFilteredAccounts`** or compute it inside the `sortedWebsites` useMemo.
- Consider using `useShallow` selectors for accounts/websites if only a subset is needed.

---
*Status*: Analyzed
