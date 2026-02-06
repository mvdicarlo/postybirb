# Performance Analysis

**Source**: `components/shared/account-picker/account-picker.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/account-picker/account-picker.tsx`

## Overview
Account selection component (211 lines). Groups accounts by website with collapsible sections and checkboxes. Contains `WebsiteAccountGroup` (individual group) and `AccountPicker` (parent orchestrator).

## Memoization Usage
- [x] useMemo — `selectedCount` in WebsiteAccountGroup ✅
- [x] useMemo — `loggedInCount` in WebsiteAccountGroup ✅
- [x] useMemo — `accountsByWebsite` Map in AccountPicker ✅
- [x] useMemo — `websites` (filters by submission type) ✅
- [x] useCallback — `handleToggleAccount` ✅
- [ ] React.memo — NOT used on `WebsiteAccountGroup`

## Re-render Triggers
- `useAccounts()` — re-renders on ANY account store update.
- `useFileWebsites()` / `useMessageWebsites()` — re-renders on website store changes.
- Props: `selectedAccountIds`, `onSelectionChange`.

## Store Subscriptions
- Account entity store (via `useAccounts`).
- Website entity store (via `useFileWebsites`, `useMessageWebsites`).

## Potential Issues
- **⚠️ `WebsiteAccountGroup` not memoized** — when `selectedAccountIds` changes on any account, ALL website groups re-render. Each group re-computes `selectedCount` and `loggedInCount` useMemos.
- **`handleToggleAccount` depends on `selectedAccountIds`** — recreated every time selection changes. Since `WebsiteAccountGroup` is not memoized, this doesn't matter yet, but would if React.memo were added.
- **Inline arrow in Checkbox `onChange`** — `(e) => onToggleAccount(account.accountId, e.currentTarget.checked)` creates closure per account per render.

## Recommendations
- **Add `React.memo` to `WebsiteAccountGroup`** — with stable `onToggleAccount` (would need to refactor to not depend on `selectedAccountIds`), this would prevent all groups from re-rendering when one checkbox changes.
- Medium priority — used in submission edit flows.

---
*Status*: Analyzed
