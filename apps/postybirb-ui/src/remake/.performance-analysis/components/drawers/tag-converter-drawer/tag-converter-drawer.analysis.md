# Performance Analysis

**Source**: `components/drawers/tag-converter-drawer/tag-converter-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/tag-converter-drawer/tag-converter-drawer.tsx`

## Overview
Tag converter drawer. Thin wrapper that creates a tag-specific `config` object and passes it to the generic `ConverterDrawer` component.

## Memoization Usage
- [x] useMemo — `config` object memoized with empty deps `[]` ✅

## Re-render Triggers
- `useActiveDrawer()` — re-renders on any drawer change.
- `useTagConverters()` — re-renders on tag converter store updates.
- `useDrawerActions()` — stable actions.

## Store Subscriptions
- Drawer UI store.
- Tag converter entity store.

## Potential Issues
- **`config` useMemo with empty deps `[]`** — contains `t()` calls for localized strings. If the locale changes while the drawer is mounted, the config won't update with new translations. Low risk since locale changes are extremely rare and require a page reload in most setups.
- Otherwise clean — delegates to `ConverterDrawer` (see that analysis for deeper issues).

## Recommendations
- Consider adding locale to `useMemo` deps if hot locale switching is supported.

---
*Status*: Analyzed
