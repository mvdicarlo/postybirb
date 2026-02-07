# Performance Analysis

**Source**: `stores/create-entity-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/create-entity-store.ts`

## Overview
Core factory function that creates Zustand entity stores. Manages records array + Map, loading state, and optional websocket subscription. Every entity store in the app is created by this factory.

## Memoization Usage
- [x] useMemo — N/A (factory function, not a hook)
- [x] useCallback — N/A
- [x] React.memo — N/A
- Uses `useShallow` in exported helper hooks (`useRecordsSelector`, `useLoadingStateSelector`)

## Re-render Triggers
This factory defines the data structures that trigger re-renders across the entire app. Key patterns:
- **`setRecords` / websocket handler replaces the entire `records` array and `recordsMap`** on every update — even if no records actually changed. This means ANY websocket event for an entity type causes ALL subscribers to that store to re-evaluate their selectors.

## Store Subscriptions
- Subscribes to `AppSocket` events when `websocketEvent` is provided.

## Potential Issues
- ~~**⚠️ CRITICAL: Full replacement on every websocket event** — `records` and `recordsMap` references change on every websocket push, even if the data is identical. Every component using `useRecords()` or `useRecordsMap()` will re-render. With a frequent event like `SUBMISSION_UPDATES`, this is a significant re-render source.~~ **Fixed** — `diffRecords` utility now preserves existing record references for unchanged entities; skips `setState` entirely when nothing changed.
- ~~**No diffing of incoming data** — a smart `setRecords` could compare incoming DTOs to existing records and only update changed ones, preserving reference equality for unchanged records.~~ **Fixed** — implemented via `diffRecords` with `id` + `updatedAt` comparison and optional `hasChanged` callback for stores needing deeper checks.
- ~~**`records` and `recordsMap` are always rebuilt together** — even if only one record changed in a 100-record collection, all 100 records are re-created via `dtos.map(createRecord)`, producing new object references.~~ **Fixed** — only changed records are re-created.
- **`loadAll` debounce only checks `loading` state** — if two rapid calls happen, the second might be skipped even if the first failed.

## Recommendations
- ~~**Implement record-level diffing**: Compare incoming DTOs by ID + updatedAt. Only create new Record instances for actually-changed entities. Reuse existing Record references for unchanged ones.~~ **Done.**
- ~~**Preserve `recordsMap` reference** when unchanged.~~ **Done** — `diffRecords` returns `null` when nothing changed, skipping `setState`.
- **Consider per-record subscriptions**: instead of subscribing to the full array, allow components to subscribe to a single record by ID, which only re-renders when that specific record changes.

---
*Status*: Analyzed
