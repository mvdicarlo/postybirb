# Performance Analysis

**Source**: `config/keybindings.ts`
**Full Path**: `apps/postybirb-ui/src/remake/config/keybindings.ts`

## Overview
Static keybinding configuration. Defines keyboard shortcuts for navigation and actions. Exports constants and a `toTinykeysFormat` utility function.

## Memoization Usage
N/A — static constants and pure functions.

## Re-render Triggers
N/A — not a hook or component.

## Store Subscriptions
None.

## Potential Issues
- **Module-level calls** to `getNavigationModifier()` and `getActionModifier()` — these run at import time. If they rely on `navigator.platform`, they should work fine in all environments.

## Recommendations
None — clean static configuration.

---
*Status*: Analyzed
