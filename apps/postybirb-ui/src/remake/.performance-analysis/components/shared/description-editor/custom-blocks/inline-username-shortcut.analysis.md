# Performance Analysis

**Source**: `components/shared/description-editor/custom-blocks/inline-username-shortcut.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/description-editor/custom-blocks/inline-username-shortcut.tsx`

## Overview
Largest custom block (684 lines). The `InlineUsernameShortcut` inline content spec renders a complex Badge with a Popover for selecting which websites a username shortcut applies to. Contains `Shortcut` sub-component for contentEditable management with MutationObserver, and `getMyInlineNode` DOM search helper.

## Memoization Usage
- [x] useMemo — `websiteOptions` (from websites store) ✅
- [x] useMemo — `filteredWebsiteOptions` (search filter with debounce) ✅
- [x] useMemo — `selectedDisplayText` ✅
- [x] useMemo — `badgeColor` ✅
- [x] useCallback — `updateSelection`, `handleWebsiteToggle`, `handleSelectAll`, `handleClearAll`, `onStale`, `handleKeyDown` (in Shortcut) ✅
- [x] useDebouncedValue — 300ms search debounce ✅

## Re-render Triggers
- `useWebsites()` — re-renders on website store changes.
- `useBlockNoteEditor()` — editor context.
- `useDisclosure()` — popover open/close.
- `useState` for `searchTerm`, `selectedWebsiteIds`.
- `useEffect` syncs `selectedWebsiteIds` from props.

## Store Subscriptions
- Website entity store (per inline username shortcut instance).

## Potential Issues
- **⚠️ HIGH: Each `InlineUsernameShortcut` instance calls `useWebsites()`** — with multiple username shortcuts in a description, each has its own store subscription. A single website login status change re-renders ALL username shortcut instances.
- **⚠️ `Shortcut` component registers a global `document.addEventListener('keydown')` per instance** — with 5 username shortcuts, that's 5 keydown listeners on document. Also uses `MutationObserver` per instance.
- **`getMyInlineNode` traverses the entire document tree** — `findInBlocks` does a recursive search on every `updateSelection` call. O(total-blocks × content-items).
- **`selectedWebsiteIds` synced via `useEffect` + `useState`** — double-render pattern (props change → render → useEffect → setState → render again).

## Recommendations
- **Lift `useWebsites()` to the editor level** and pass websites as context/prop to inline content specs. Eliminates N store subscriptions.
- **Consider debouncing `updateSelection`** — if user rapidly toggles checkboxes, each toggle triggers editor block update.
- Medium-high priority — used in description editing, which is the most interactive part of the app.

---
*Status*: Analyzed
