# Performance Analysis

**Source**: `components/shared/description-editor/description-editor.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/description-editor/description-editor.tsx`

## Overview
BlockNote-based rich text editor (164 lines). Contains `DescriptionEditorInner` (creates BlockNote editor instance with custom schema and suggestion menus) and outer `DescriptionEditor` (wraps with locale-based key for remounting on locale change).

## Memoization Usage
- [x] useMemo — `schema` (empty deps `[]`) ✅
- [x] useMemo — `usernameShortcuts` (keyed on websites) ✅

## Re-render Triggers
- `useMantineColorScheme()` — re-renders on theme change.
- `useLingui()` — re-renders on locale change (but outer component remounts via key).
- `useCustomShortcuts()` — re-renders on custom shortcut store updates.
- `useWebsites()` — re-renders on website store updates.
- `useLocale()` — outer component, re-renders on locale change.

## Store Subscriptions
- Custom shortcut entity store.
- Website entity store.
- Mantine color scheme context.
- Locale store.

## Potential Issues
- **⚠️ HIGH: `onChange` callback on BlockNoteView is an inline arrow** — `onChange={() => { onChange(editor.document as Description); }}` creates a new function every render. BlockNote may use this for comparison.
- **⚠️ `SuggestionMenuController` `getItems` is recreated every render** — the `async (query) => {...}` closures capture `customShortcuts`, `usernameShortcuts`, `isDefaultEditor`. These are new function references per render.
- **`shortcutTriggers.map(...)` creates 3 `SuggestionMenuController` elements per render** — each with a `key` missing (React will warn). Also, each re-render creates new `getItems` functions for all three.
- **`useCreateBlockNote` runs once** — correctly uses `initialContent`. ✅

## Recommendations
- **Wrap `onChange` in `useCallback`** — `useCallback(() => onChange(editor.document), [editor, onChange])`.
- **Memoize `getItems` callbacks** with `useCallback` to prevent BlockNote from unnecessarily re-initializing suggestion controllers.
- **Add `key` to `SuggestionMenuController` elements** in the map.
- High priority — BlockNote is expensive and this component is used in every submission edit.

---
*Status*: Analyzed
