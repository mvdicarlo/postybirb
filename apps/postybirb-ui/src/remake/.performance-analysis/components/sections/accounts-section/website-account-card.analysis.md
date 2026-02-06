# Performance Analysis

**Source**: `components/sections/accounts-section/website-account-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/website-account-card.tsx`

## Overview
Website card with expandable account list (418 lines). Contains `AccountRow` sub-component (inline name editing, login/reset/delete actions) and `WebsiteAccountCard` (collapse, add account popover). Most complex component in accounts section.

## Memoization Usage
None in either `AccountRow` or `WebsiteAccountCard`.

## Re-render Triggers
- `AccountRow`: `useAccountActions(account.id)` from context, `useState` for editing/name, `useDisclosure` for reset popover.
- `WebsiteAccountCard`: `useLingui()`, `useAccountsContext()`, `useDisclosure` for expand/add popover, `useState` for new account name, creating state.

## Store Subscriptions
- AccountsContext (via `useAccountActions` / `useAccountsContext`).

## Potential Issues
- **⚠️ `AccountRow` not wrapped in `React.memo`** — when parent (`WebsiteAccountCard`) re-renders, ALL account rows re-render. With 5 accounts per website and 20 websites, that's up to 100 account row re-renders per change.
- **`WebsiteAccountCard` not wrapped in `React.memo`** — when parent `AccountsSection` re-renders (any store change), all website cards re-render even if their props didn't change.
- **`handleCreateAccount` and `handleAddKeyDown` are not memoized** — new functions every render.
- **Inline `handleNameBlur`, `handleNameKeyDown`, `handleNameClick` in `AccountRow`** — new functions every render per row.

## Recommendations
- **Wrap `WebsiteAccountCard` in `React.memo`** with a custom comparison on `website.id` and `accounts`.
- **Wrap `AccountRow` in `React.memo`** — keyed on `account.id`, re-renders only when account data changes.
- **Memoize action handlers** with `useCallback`.
- Medium-high priority — this is the main account listing and re-renders on every account/website store change.

---
*Status*: Analyzed
