# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/submission-badges.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/submission-badges.tsx`

## Overview
Status badges component (~100 lines). Shows queued, errors, warnings, ready, no-websites badges.

## Memoization Usage
None.

## Re-render Triggers
- `useLocale()` — formatDateTime.
- Props: `submission`, `submissionType`.

## Store Subscriptions
None — prop-driven.

## Potential Issues
- Conditionally renders multiple badges — cheap JSX, no performance concern.

## Recommendations
- Wrap in `React.memo` for list performance.

---
*Status*: Analyzed
