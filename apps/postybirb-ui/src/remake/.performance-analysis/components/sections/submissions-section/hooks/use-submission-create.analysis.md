# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submission-create.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submission-create.ts`

## Overview
Hook for submission creation handlers (~130 lines). File upload with metadata, message creation, legacy file input.

## Memoization Usage
- [x] useCallback — `openFileModal`, `closeFileModal`, `handleFileUpload`, `handleCreateSubmission`, `handleCreateMessageSubmission`, `handleFileChange` ✅ (all with minimal or empty deps)

## Re-render Triggers
- `useState` for `isFileModalOpen`.
- `useRef` for `fileInputRef` (no re-render).

## Store Subscriptions
None.

## Potential Issues
None — well-designed with stable callbacks.

## Recommendations
None.

---
*Status*: Analyzed
