# Performance Analysis

**Source**: `hooks/tag-search/tag-search-providers.ts`
**Full Path**: `apps/postybirb-ui/src/remake/hooks/tag-search/tag-search-providers.ts`

## Overview
Registry mapping provider IDs to `TagSearchProvider` instances. Currently only registers `e621` provider. Imports from the legacy location with a type cast.

## Memoization Usage
N/A — static registry.

## Re-render Triggers
N/A.

## Store Subscriptions
None.

## Potential Issues
- **Type cast (`as unknown as TagSearchProvider`)** — the legacy provider has a compatible but different base class. This works at runtime but hides type mismatches.

## Recommendations
None — static configuration.

---
*Status*: Analyzed
