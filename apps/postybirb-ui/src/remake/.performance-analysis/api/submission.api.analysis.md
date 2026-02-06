# Performance Analysis

**Source**: `api/submission.api.ts`
**Full Path**: `apps/postybirb-ui/src/remake/api/submission.api.ts`

## Overview
Submission API extending BaseApi. Most complex API class — adds `createMessageSubmission`, `duplicate`, `updateTemplateName`, `createFileSubmission` (overloaded with legacy signature), `reorder`, `applyToMultipleSubmissions`, `applyTemplate`, `applyTemplateOptions`, `unarchive`, `archive`. Uses FormData for file uploads.

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

## Re-render Triggers
N/A — pure class, no React.

## Store Subscriptions
None.

## Potential Issues
None — stateless API singleton, no performance concerns.

## Recommendations
None.

---
*Status*: Analyzed
