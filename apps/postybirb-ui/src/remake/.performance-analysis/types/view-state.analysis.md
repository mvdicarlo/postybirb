# Performance Analysis

**Source**: `types/view-state.ts`
**Full Path**: `apps/postybirb-ui/src/remake/types/view-state.ts`

## Overview
View state type definitions using discriminated unions. Defines `SectionId`, per-section parameter interfaces, `ViewState` union type, section panel configs, and factory functions for creating default view states.

## Memoization Usage
N/A — types and factory functions.

## Re-render Triggers
N/A — not a hook. Factory functions (`createHomeViewState`, etc.) create new objects on every call, which is expected.

## Store Subscriptions
None.

## Potential Issues
- **Factory functions create new objects each call** — callers should be aware not to call these inline during render without memoization, or they'll trigger re-renders when passed as props.

## Recommendations
None — clean type definitions.

---
*Status*: Analyzed
