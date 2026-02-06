# Performance Analysis

**Source**: `components/dialogs/settings-dialog/sections/spellchecker-settings-section.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/dialogs/settings-dialog/sections/spellchecker-settings-section.tsx`

## Overview
Spellchecker configuration (145 lines). Uses 4 `useQuery` calls to fetch Electron spellchecker data (all languages, active languages, custom words, startup settings). Provides language multi-select and custom words tags input.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- **4 `useQuery` hooks** — each has independent loading/data state. Multiple re-renders as each query resolves.
- `useLocale()` — re-renders when locale changes.
- `useLingui()` — re-renders when i18n context changes.

## Store Subscriptions
None via Zustand directly. Uses `useLocale` (which reads from Lingui context).

## Potential Issues
- **⚠️ Language data `.map().sort()` computed inline on every render** — the MultiSelect `data` prop maps all spellchecker languages, looks up translations with `.find()`, then sorts. This is O(n × m) where n = available languages and m = supported languages, computed on every render.
- **4 concurrent `useQuery` calls** — all fire on mount. With `cacheTime: 0` on 3 of them, re-opening the settings section fires 4 fresh API/Electron IPC calls.
- **`tagProviders` array recreated on every render inside `TagsSettingsSection`** — but that's in a different file. For this file, the data mapping is the concern.

## Recommendations
- **Memoize the MultiSelect `data` transformation** — wrap in `useMemo` keyed on `[allSpellcheckerLanguages.data, locale]` to avoid recomputing the map+sort on every render.
- Low priority overall — settings modal, rarely open.

---
*Status*: Analyzed
