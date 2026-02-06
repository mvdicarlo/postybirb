# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/file-management/file-alt-text-editor.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/file-management/file-alt-text-editor.tsx`

## Overview
BlockNote rich text editor for TEXT file fallback content (~120 lines). Fetches HTML via `useQuery`, creates BlockNote editor, debounced save on blur.

## Memoization Usage
- [x] useCallback — `onChange` (debounced save) ✅

## Re-render Triggers
- Props: `file`.
- `useQuery` for `initialHTML` — `isLoading`, `isFetching`.
- `useMantineColorScheme()` — `colorScheme`.
- `useCreateBlockNote` creates editor instance.
- `useEffect` loads initial HTML into editor.

## Store Subscriptions
None — uses react-query for data fetching.

## Potential Issues
- **⚠️ BlockNote editor is a heavy component** — creates full WYSIWYG editor with schema. Rendered per TEXT file in metadata expansion. Multiple open = multiple editors.
- **`onChange` debounce (500ms)** — correct pattern but uses `useCallback(debounce(...))` which recreates the debounced function if deps change. The eslint-disable suggests awareness.
- **`editor.replaceBlocks` in useEffect** — runs whenever `initialHTML` changes. If query refetches, editor content is overwritten.

## Recommendations
- Only mount editor when metadata section is expanded (currently handled by Collapse parent).
- Consider `useMemo` for the debounced function to avoid recreation.

---
*Status*: Analyzed
