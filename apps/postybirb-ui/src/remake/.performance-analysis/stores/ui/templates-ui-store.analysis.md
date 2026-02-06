# Performance Analysis

**Source**: `stores/ui/templates-ui-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/ui/templates-ui-store.ts`

## Overview
Templates UI state store with localStorage persistence. Manages template tab type and search query.

## Memoization Usage
- [x] useShallow — in `useTemplatesFilter`

## Re-render Triggers
- `useTemplatesFilter` bundles tab type + search query + setters.

## Store Subscriptions
None from websocket. Persists to localStorage.

## Potential Issues
None significant — small state, infrequent updates.

## Recommendations
None.

---
*Status*: Analyzed
