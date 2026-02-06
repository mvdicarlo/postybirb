# Performance Analysis

**Source**: `stores/index.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/index.ts`

## Overview
Barrel export file for all stores, records, and hooks. ~215 lines of re-exports organized by category (base utilities, UI stores, entity stores, records).

## Memoization Usage
N/A — barrel export only.

## Re-render Triggers
N/A.

## Store Subscriptions
None.

## Potential Issues
- **Large barrel export** — importing from `../stores` will pull in the entire stores module graph, including all websocket subscriptions (since entity stores set up listeners at module evaluation time). This means importing ANY store symbol also initializes ALL entity stores and their websocket listeners.
- This is likely intentional (stores are singletons), but it means tree-shaking won't help — all stores are always initialized.

## Recommendations
- If lazy initialization is desired for some stores, they should be moved out of the barrel or use dynamic imports.
- Not a practical issue since the app needs all stores anyway.

---
*Status*: Analyzed
