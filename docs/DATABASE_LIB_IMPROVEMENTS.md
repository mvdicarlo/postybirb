# Database Library Improvements Plan

## Overview

Fix the drizzle schema type (relations missing from `drizzle()` call), reduce excessive `as never` casts in `entity-repository.ts`, and clean up stale comments.

**Branch:** `users/mvdicarlo/db-wrapper-refactor`

---

## Phase 1: Fix drizzle schema type (include relations)

- [ ] In `database.ts`, import relations and merge with schema passed to `drizzle()`
- [ ] Update `PostyBirbDatabaseType` to reflect combined type (tables + relations)
- [ ] Verify `SchemaQuery<K>` properly includes `with` clause shapes

**Why:** `database.ts` currently passes only table schemas to `drizzle()`. Relations are required by drizzle's relational query API (`db.query.X.findMany({ with: ... })`). The type parameter is incomplete, causing downstream type widening.

## Phase 2: Reduce casts in entity-repository.ts

- [ ] Re-evaluate which of the 19 `as never`/`as unknown` casts become unnecessary
- [ ] Remove casts that TypeScript can now resolve with the corrected DB type
- [ ] Document which casts must remain (table-operation casts for insert/update/delete/select — drizzle demands exact table types, not generic unions)

## Phase 3: Minor cleanups

- [ ] Remove stale "legacy PostyBirbDatabase" comment from `SubscriberCb` in `types.ts`
- [ ] Check if `: any` annotations on `where` callbacks in client-server services can be removed

---

## Key Decisions

| Decision | Outcome |
|----------|---------|
| Delete `relations.ts`? | **NO** — required by drizzle relational query API |
| Co-locate relations into `schemas/`? | Skip — cosmetic, no functional benefit |
| Table-operation casts removable? | Likely **NO** — generic base class limitation with drizzle's exact-type API |

## Verification

1. `nx run database:test` — green
2. `nx run client-server:test` — green
3. `npx nx build client-server --skip-nx-cache` — zero errors
4. Check if `where` callback `: any` annotations can be removed

## Files

| File | Change |
|------|--------|
| `libs/database/src/lib/database.ts` | Import relations, merge into schema, fix type |
| `libs/database/src/lib/repositories/base/entity-repository.ts` | Reduce casts |
| `libs/database/src/lib/repositories/base/types.ts` | Comment cleanup, possibly simplify `AllSchemas` |
| `libs/database/src/lib/relations/relations.ts` | Keep as-is |
