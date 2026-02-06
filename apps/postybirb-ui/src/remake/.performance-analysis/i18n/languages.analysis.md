# Performance Analysis

**Source**: `i18n/languages.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/i18n/languages.tsx`

## Overview
Static language configuration. Defines supported languages with their display names (using `msg` for static extraction), and maps for date, calendar, BlockNote, and cronstrue locale codes. Also imports required dayjs and cronstrue locale side-effect modules.

## Memoization Usage
N/A — static configuration.

## Re-render Triggers
N/A.

## Store Subscriptions
None.

## Potential Issues
- **Side-effect imports** (`import 'dayjs/locale/de'`, etc.) — these register locales at module load time. This means all locale data is loaded upfront regardless of which locale is active. For 7 languages, this is acceptable (~few KB each).

## Recommendations
None — clean static configuration.

---
*Status*: Analyzed
