# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/tag-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/tag-field.tsx`

## Overview
Tag input with tag groups, tag conversion display, and search provider support (~200 lines). Complex field with multiple store subscriptions.

## Memoization Usage
- [x] useMemo — `tagValue`, `allTags`, `convertedTags`, `tagGroupsOptions` ✅

## Re-render Triggers
- Context: `useFormFieldsContext()` — `getValue`, `setValue`, `option`.
- `useDefaultOption(fieldName)`.
- `useValidations(fieldName)`.
- Stores: `useNonEmptyTagGroups()`, `useTagConverters()`, `useAccount(accountId)`, `useSettings()`.
- Hook: `useTagSearch(searchProviderId)` — manages `searchValue`, `onSearchChange`, `data`.

## Store Subscriptions
- **`useNonEmptyTagGroups()`** — tag group list.
- **`useTagConverters()`** — tag converter list.
- **`useAccount(accountId)`** — specific account record.
- **`useSettings()`** — global settings.

## Potential Issues
- **⚠️ HIGH: 4 store subscriptions per TagField instance** — this is the heaviest field component. With 5 expanded accounts, that's 20 store subscriptions just for tags. Any tag group, converter, account, or settings change triggers re-render of ALL tag fields.
- **`convertedTags` computed per render** — correctly memoized but depends on `allTags` and `tagConverters`, both of which change easily.
- **`tagGroupsOptions` creates complex JSON-encoded labels** — `JSON.stringify` per group per render. Correctly memoized.
- **`renderOption` creates JSX inline** — new function per render, passed to TagsInput.

## Recommendations
- **HIGH**: Lift tag groups, converters, and settings to a shared context or memoized provider to avoid per-field subscriptions.
- Consider `React.memo` on TagField to prevent re-renders from context changes.

---
*Status*: Analyzed
