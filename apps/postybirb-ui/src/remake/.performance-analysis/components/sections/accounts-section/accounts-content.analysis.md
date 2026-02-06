# Performance Analysis

**Source**: `components/sections/accounts-section/accounts-content.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/accounts-section/accounts-content.tsx`

## Overview
Primary content area for accounts view (220 lines). Shows login webview or custom login component based on selected account. Contains sub-components: `AccountHeader`, `UserLoginContent`, `CustomLoginContent`.

## Memoization Usage
- [x] useCallback — `onClose` (clears selection in view state) ✅

## Re-render Triggers
- `useAccount(selectedId)` — re-renders when selected account changes.
- `useWebsite(account?.website)` — re-renders when website data changes.
- `useNavigationStore()` — setViewState action.
- Prop: `viewState`.

## Store Subscriptions
- Account entity store (single account by ID).
- Website entity store (single website by ID).
- Navigation store (actions).

## Potential Issues
- **Sub-components (`AccountHeader`, `UserLoginContent`, `CustomLoginContent`) are defined in same file** — they don't re-render independently; when parent re-renders, all re-render. Fine since they're simple presentational wrappers.

## Recommendations
None significant — clean component with targeted store subscriptions.

---
*Status*: Analyzed
