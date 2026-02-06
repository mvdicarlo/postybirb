# Performance Analysis

**Source**: `components/shared/description-editor/custom-blocks/inline-custom-shortcut.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/description-editor/custom-blocks/inline-custom-shortcut.tsx`

## Overview
BlockNote inline content spec for custom shortcuts (79 lines). Renders a grape-colored Badge showing the shortcut name. Also exports `getCustomShortcutsMenuItems` factory.

## Memoization Usage
- [x] useMemo — finds shortcut by ID from the custom shortcuts store array ✅
- Uses `useCustomShortcuts()` inside `createReactInlineContentSpec` render function.

## Re-render Triggers
- `useCustomShortcuts()` — re-renders on custom shortcut store changes.
- BlockNote controls when inline content re-renders.

## Store Subscriptions
- Custom shortcut entity store (per inline content instance).

## Potential Issues
- **⚠️ Each inline custom shortcut badge calls `useCustomShortcuts()`** — if there are 10 custom shortcuts in a description, that's 10 store subscriptions. Each store update re-renders all of them.
- The `useMemo` find is O(N) per shortcut per render.

## Recommendations
- Consider passing the shortcut name as a prop instead of looking it up from the store (would require updating the inline content spec schema).
- Low-medium priority — inline content renders are managed by BlockNote.

---
*Status*: Analyzed
