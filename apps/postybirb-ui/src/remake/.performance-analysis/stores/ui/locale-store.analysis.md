# Performance Analysis

**Source**: `stores/ui/locale-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/ui/locale-store.ts`

## Overview
Locale state store with localStorage persistence. Manages the current language code. Detects default language from browser locale.

## Memoization Usage
- [x] useShallow — in `useLanguageActions`

## Re-render Triggers
- **`useLanguage`**: single string value — clean. ✅
- **`useLanguageActions`**: `useShallow` on language + setLanguage. `setLanguage` is stable, so `useShallow` comparison of it is unnecessary.

## Store Subscriptions
None from websocket. Persists to localStorage.

## Potential Issues
None — language changes are extremely rare (user manually switching).

## Recommendations
None.

---
*Status*: Analyzed
