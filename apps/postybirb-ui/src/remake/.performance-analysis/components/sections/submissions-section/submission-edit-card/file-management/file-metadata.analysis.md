# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/file-management/file-metadata.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/file-management/file-metadata.tsx`

## Overview
Complex metadata editor (~380 lines). Contains FileMetadata (main), FileDimensions (aspect-ratio locked resizing with per-account overrides), FileSourceUrls (dynamic URL list), CustomAccountDimensions.

## Memoization Usage
- [x] useCallback — `save` in FileMetadata ✅
- [x] useMemo — `debouncedSave` in FileDimensions ✅

## Re-render Triggers
- Props: `file`, `accounts`.
- Multiple `useState` in sub-components: `height`, `width`, `selectedAccountId`, `urls`.
- `useRef` for `aspectRef`.

## Store Subscriptions
None.

## Potential Issues
- **⚠️ Direct metadata mutation** — `metadata.ignoredWebsites = ...`, `metadata.altText = ...`, `metadata.spoilerText = ...` mutate the file DTO directly. This bypasses React's change detection. The UI updates because `save()` triggers API call + websocket update → store update → re-render. But intermediate state is inconsistent.
- **`save` callback depends on `[file.id, metadata]`** — since `metadata` is mutated in place, the reference never changes, so `save` is stable. Correct but fragile.
- **FileDimensions has its own local state** that mirrors metadata dimensions — sync issues possible if parent re-renders with new file data.
- **CustomAccountDimensions creates `accountOptions` inline** — new array every render.

## Recommendations
- **MEDIUM**: Use immutable updates instead of direct mutation for metadata fields. Create a new metadata object and let React detect the change.
- Memoize `accountOptions` in CustomAccountDimensions.

---
*Status*: Analyzed
