# Performance Analysis

**Source**: `stores/records/submission-record.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/records/submission-record.ts`

## Overview
Most complex record class (266 lines). Represents a submission entity with files, options, posts, validations, scheduling, and metadata. Many computed getters for derived state.

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

## Re-render Triggers
N/A — plain class. However, the getters on this class ARE called frequently from components.

## Store Subscriptions
None.

## Potential Issues
- **`primaryFile` getter sorts the `files` array on every access** — `this.files.sort(...)` mutates and re-sorts each call. If a component reads `submission.primaryFile` during render, this runs per-render. With many submissions in a list, this adds up.
- **`lastModified` getter iterates all files AND all options** — O(files + options) per access. Called frequently in sort operations and display.
- **`sortedPosts` / `sortedPostsDescending` create new sorted arrays on every access** — `[...this.posts].sort(...)` allocates a new array each call. If used in rendering lists, this creates GC pressure.
- **`hasErrors` / `hasWarnings` use `.some()` which is fine** — short-circuits early.
- **`title` getter does a `.find()` on options array** — O(n) per access, but options arrays are typically small (<20).

## Recommendations
- **Cache `primaryFile`**: compute once in constructor since `files` is immutable (readonly). Same for `sortedPosts` / `sortedPostsDescending`.
- **Cache `lastModified`**: compute once in constructor since all data is immutable after construction.
- Alternatively, use lazy getters that compute once and cache: `get primaryFile() { return this._primaryFile ??= ... }`.

---
*Status*: Analyzed
