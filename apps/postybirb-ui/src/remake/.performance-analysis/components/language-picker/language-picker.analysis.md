# Performance Analysis

**Source**: `components/language-picker/language-picker.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/language-picker/language-picker.tsx`

## Overview
Language selection component rendered as a NavLink with a Menu popup. Shows current language name and allows switching to any configured language.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- `useLingui()` — re-renders on locale changes (by design, to update language names).
- `useLanguageActions()` — provides `language` and `setLanguage`. Re-renders when language changes.
- `useDisclosure()` — local menu open/close state.
- `useState` for `hoveredLang` — re-renders on hover of each menu item.

## Store Subscriptions
- Locale store (via `useLanguageActions`).

## Potential Issues
- **`hoveredLang` state causes re-render of entire component on every menu item hover** — each `onMouseEnter`/`onMouseLeave` re-creates all `Menu.Item` elements. With ~10 languages, this means ~20 unnecessary re-renders during browse.
- **`t(label)` called for every language on every render** — `languages.map(([label, value]) => { ... t(label) ... })`. Translation lookup per item per render.
- **Inline arrow in `onClick` of Menu.Item** — `() => { setLocale(value); close(); }` creates new closure per item per render.

## Recommendations
- **Extract `Menu.Item` map to a memoized sub-component** or use `useMemo` for the language items list.
- **Remove `hoveredLang` state** — use CSS `:hover` pseudo-class instead of React state for hover styling.
- Low priority — menu is only open during active user interaction and language list is small.

---
*Status*: Analyzed
