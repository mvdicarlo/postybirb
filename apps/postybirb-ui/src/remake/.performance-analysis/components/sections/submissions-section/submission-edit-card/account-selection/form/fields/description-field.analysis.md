# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/description-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/description-field.tsx`

## Overview
Rich text editor for descriptions (~140 lines). BlockNote DescriptionEditor integration with override-default checkbox, insert-title/tags toggles, legacy shortcut detection.

## Memoization Usage
- [x] useMemo — `description`, `hasTagsShortcut`, `hasTitleShortcut`, `containsLegacyShortcuts` ✅

## Re-render Triggers
- Context: `useFormFieldsContext()` — `getValue`, `setValue`, `option`.
- `useDefaultOption(fieldName)`.
- `useValidations(fieldName)`.
- Props: `fieldName`, `field`.

## Store Subscriptions
None.

## Potential Issues
- **⚠️ DescriptionEditor is a HEAVY component** — BlockNote WYSIWYG editor with full toolbar, slash menu, custom shortcuts. One per account option × per submission. If 5 accounts are expanded, 5 editors are mounted.
- **Re-renders when ANY field changes** — due to FormFieldsContext instability. DescriptionEditor may reinitialize on re-render.
- **`hasInlineContentType` and `hasLegacyShortcuts` are recursive tree walks** — correctly memoized on `description` reference.

## Recommendations
- **HIGH**: Ensure DescriptionEditor is NOT remounted on FormFieldsContext changes. Consider `React.memo` wrapper.
- Lazy-mount editors — only create editor when user interacts with the field.

---
*Status*: Analyzed
