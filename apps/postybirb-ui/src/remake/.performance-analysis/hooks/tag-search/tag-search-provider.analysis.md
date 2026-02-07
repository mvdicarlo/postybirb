# Performance Analysis

**Source**: `hooks/tag-search/tag-search-provider.ts`
**Full Path**: `apps/postybirb-ui/src/remake/hooks/tag-search/tag-search-provider.ts`

## Overview
Abstract base class for tag search providers. Implements a caching layer with 1-hour TTL. Subclasses implement `searchImplementation()` and `renderSearchItem()`.

## Memoization Usage
N/A — plain class with manual caching via `Map`.

## Re-render Triggers
N/A — not a React hook or component.

## Store Subscriptions
None.

## Potential Issues
- ~~**Cache uses a `Map` that grows unbounded** — there's no cache size limit. With many unique search queries over time, the Map could grow large. The 1-hour TTL only prevents stale reads, not memory growth.~~ **Fixed** — LRU eviction added with max 200 entries.

## Recommendations
- ~~Add a max cache size (LRU eviction) to prevent unbounded memory growth during long sessions.~~ **Done** — cache capped at 200 entries with LRU ordering (cache hits moved to end of Map).
- Low priority since tag searches are user-paced.

---
*Status*: Analyzed
