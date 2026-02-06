# Performance Analysis

**Source**: `providers/i18n-provider.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/providers/i18n-provider.tsx`

## Overview
React provider component wrapping the app with Lingui i18n and Mantine DatesProvider. Dynamically loads locale `.po` files. Shows a loading spinner until translations are ready.

## Memoization Usage
- [x] useCallback — wraps `loadLocale` function. ✅ Correctly memoized with empty deps (stable reference).
- [ ] useMemo — not used (not needed)
- [ ] React.memo — not used (provider component, shouldn't be memoized)

## Re-render Triggers
- **`useLanguage()`** — subscribes to locale store. Re-renders when language changes.
- **`useState` for `loaded` and `tooLongLoading`** — local loading state.
- **`useEffect` on `[locale, loadLocale]`** — runs when locale changes to load new translations.

## Store Subscriptions
- Locale UI store (via `useLanguage`).

## Potential Issues
- **Dynamic import on locale change** — `import(...)` is async and causes a flash of loading state when switching languages. This is expected but could be smoothed with concurrent rendering.
- **5-second timeout for "too long" message** — timer is set on mount regardless of loading speed. If loading takes 2s, the timer still runs for 5s before cleanup.
- **`moment.locale(lang)` called inside `loadLocale`** — sets global moment locale. This is fine as a side effect inside useCallback since it's called within useEffect.

## Recommendations
- The loading experience is acceptable. No significant performance concerns.
- The 5-second "too long" UX feedback is a nice touch.

---
*Status*: Analyzed
