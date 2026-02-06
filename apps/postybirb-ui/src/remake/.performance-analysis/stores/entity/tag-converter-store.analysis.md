# Performance Analysis

**Source**: `stores/entity/tag-converter-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/tag-converter-store.ts`

## Overview
Tag converter entity store using `createTypedStore`. Standard hooks, no additional selectors.

## Memoization Usage
- [x] useShallow — via `createTypedStore`

## Re-render Triggers
Standard entity store pattern.

## Store Subscriptions
- Subscribes to `TAG_CONVERTER_UPDATES`.

## Potential Issues
Same systemic issues. Low impact — tag converters change rarely.

## Recommendations
None — low priority.

---
*Status*: Analyzed
