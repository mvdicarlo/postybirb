# Performance Analysis

**Source**: `components/disclaimer/disclaimer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/disclaimer/disclaimer.tsx`

## Overview
Two-part disclaimer system (197 lines). `Disclaimer` wrapper checks localStorage for prior acceptance and conditionally renders `DisclaimerDisplay` or children. `DisclaimerDisplay` shows the legal notice with accept/decline buttons. One-time gate at app startup.

## Memoization Usage
- [x] useMemo — `viewportHeight` in DisclaimerDisplay (empty deps, computed once). `initialAccepted` in Disclaimer (reads localStorage once). Both appropriate.
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- `Disclaimer`: `useState` for `accepted` — only changes once (accept click). Then renders children forever.
- `DisclaimerDisplay`: `useState` for `checked` — changes on checkbox toggle.
- `useEffect` for focus and localStorage write — run once each.

## Store Subscriptions
None.

## Potential Issues
- **`viewportHeight` useMemo with empty deps** — computes `window.innerHeight` once. If the window resizes before acceptance, the height is stale. Not a real issue since the disclaimer is shown briefly on startup.
- **`attemptAppQuit` function defined at module level** — fine, no performance concern.
- **`handleDecline` recreated on every Disclaimer render** — only matters while disclaimer is shown (brief period), and it's passed to a button click, not a memoized child.

## Recommendations
None — one-time startup gate component. No performance concerns.

---
*Status*: Analyzed
