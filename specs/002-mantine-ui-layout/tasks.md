# Tasks: Mantine UI Layout Foundation

**Input**: Design documents from `/specs/002-mantine-ui-layout/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Paths use the structure defined in plan.md:
- Base: `apps/postybirb-ui/src/remake/`
- Components: `apps/postybirb-ui/src/remake/components/`
- Routes: `apps/postybirb-ui/src/remake/routes/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency updates, and basic structure

- [ ] T001 Update Mantine packages from v7 to v8 in package.json (run: `yarn add @mantine/core@^8 @mantine/hooks@^8 @mantine/dates@^8`)
- [ ] T002 Create remake directory structure per plan.md at `apps/postybirb-ui/src/remake/`
- [ ] T003 [P] Create type definitions in `apps/postybirb-ui/src/remake/types/navigation.ts` per data-model.md
- [ ] T004 [P] Create layout constants and CSS in `apps/postybirb-ui/src/remake/styles/layout.css` per contracts
- [ ] T005 [P] Create navigation configuration in `apps/postybirb-ui/src/remake/config/nav-items.ts` with 3 demo sections

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Implement `useSideNav` hook with localStorage persistence in `apps/postybirb-ui/src/remake/hooks/use-sidenav.ts`
- [ ] T007 Implement `RemakeI18nProvider` based on existing app-i18n-provider pattern in `apps/postybirb-ui/src/remake/providers/remake-i18n-provider.tsx`
- [ ] T008 Create route configuration and structure in `apps/postybirb-ui/src/remake/routes/index.tsx`
- [ ] T009 [P] Create `ContentArea` wrapper component in `apps/postybirb-ui/src/remake/components/layout/content-area.tsx`
- [ ] T010 Create `Layout` shell component with custom flexbox (no AppShell) in `apps/postybirb-ui/src/remake/components/layout/layout.tsx`
- [ ] T011 Create `RemakeApp` entry point with MantineProvider, i18n, and Router in `apps/postybirb-ui/src/remake/index.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Navigate Between Main Sections (Priority: P1) 🎯 MVP

**Goal**: Users can navigate between different main sections using the side navigation

**Independent Test**: Click on different navigation items in the sidenav and verify the main content area updates appropriately. Navigation should complete within 2 seconds.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create `NavItem` component using Mantine NavLink in `apps/postybirb-ui/src/remake/components/layout/nav-item.tsx`
- [ ] T013 [US1] Create `SideNav` component with navigation items in `apps/postybirb-ui/src/remake/components/layout/side-nav.tsx`
- [ ] T014 [P] [US1] Create `HomePage` demo component in `apps/postybirb-ui/src/remake/routes/pages/home/home-page.tsx`
- [ ] T015 [P] [US1] Create `SubmissionsPage` demo component in `apps/postybirb-ui/src/remake/routes/pages/submissions/submissions-page.tsx`
- [ ] T016 [P] [US1] Create `SettingsPage` demo component in `apps/postybirb-ui/src/remake/routes/pages/settings/settings-page.tsx`
- [ ] T017 [US1] Wire navigation items to routes and verify active state highlighting in `apps/postybirb-ui/src/remake/components/layout/side-nav.tsx`
- [ ] T018 [US1] Integrate SideNav into Layout component in `apps/postybirb-ui/src/remake/components/layout/layout.tsx`

**Checkpoint**: User Story 1 complete - sidenav navigation between 3 sections works (SC-001)

---

## Phase 4: User Story 2 - Collapse and Expand Side Navigation (Priority: P1)

**Goal**: Users can collapse and expand the sidenav to maximize content viewing area

**Independent Test**: Click the collapse/expand control, verify sidenav shrinks to icon-only state and expands back. State persists across page refresh.

### Implementation for User Story 2

- [ ] T019 [US2] Add collapse toggle button to SideNav component in `apps/postybirb-ui/src/remake/components/layout/side-nav.tsx`
- [ ] T020 [US2] Implement collapsed state styling (icons only, tooltips on hover) in `apps/postybirb-ui/src/remake/components/layout/side-nav.tsx`
- [ ] T021 [US2] Add CSS transitions for collapse/expand animation in `apps/postybirb-ui/src/remake/styles/layout.css`
- [ ] T022 [US2] Connect collapse state to Layout for content area width adjustment in `apps/postybirb-ui/src/remake/components/layout/layout.tsx`
- [ ] T023 [US2] Verify localStorage persistence of collapse state (SC-004)

**Checkpoint**: User Story 2 complete - sidenav collapse/expand works with persistence (SC-002, SC-004)

---

## Phase 5: User Story 5 - View Primary Content (Priority: P1)

**Goal**: Users see content in a dedicated scrollable area below the content navbar

**Independent Test**: Load content and verify it displays in the designated content area with appropriate sizing and independent scrolling.

### Implementation for User Story 5

- [ ] T024 [US5] Enhance ContentArea with loading state overlay in `apps/postybirb-ui/src/remake/components/layout/content-area.tsx`
- [ ] T025 [US5] Ensure ContentArea scrolls independently of fixed navigation (SC-007) in `apps/postybirb-ui/src/remake/styles/layout.css`
- [ ] T026 [US5] Verify content area width adjusts with sidenav collapse state (acceptance scenario 3)

**Checkpoint**: User Story 5 complete - content area renders and scrolls properly (SC-007)

---

## Phase 6: User Story 3 - View Contextual Sub-Navigation (Priority: P2)

**Goal**: Users see contextual sub-navigation options based on current section

**Independent Test**: Navigate to a section and verify sub-nav bar displays section-appropriate content that scrolls when content exceeds visible area.

### Implementation for User Story 3

- [ ] T027 [US3] Create `SubNavBar` component with ScrollArea in `apps/postybirb-ui/src/remake/components/layout/sub-nav-bar.tsx`
- [ ] T028 [US3] Add sub-nav configuration per demo page (Home, Submissions, Settings) in route definitions
- [ ] T029 [US3] Integrate SubNavBar into Layout component below sidenav header in `apps/postybirb-ui/src/remake/components/layout/layout.tsx`
- [ ] T030 [US3] Wire sub-nav content updates on route change (SC-005: <500ms update)
- [ ] T031 [US3] Handle edge case: hide or minimize sub-nav when no items configured

**Checkpoint**: User Story 3 complete - sub-nav displays contextual content per section (SC-005)

---

## Phase 7: User Story 4 - Navigate Paginated Content (Priority: P2)

**Goal**: Users can navigate through paginated content using controls in the content navbar

**Independent Test**: Load section with paginated content and use pagination controls to move between pages.

### Implementation for User Story 4

- [ ] T032 [P] [US4] Create `ContentNavbar` component with Mantine Pagination in `apps/postybirb-ui/src/remake/components/layout/content-navbar.tsx`
- [ ] T033 [US4] Integrate ContentNavbar into Layout above ContentArea in `apps/postybirb-ui/src/remake/components/layout/layout.tsx`
- [ ] T034 [US4] Add pagination state and handlers to a demo page (e.g., SubmissionsPage) in `apps/postybirb-ui/src/remake/routes/pages/submissions/submissions-page.tsx`
- [ ] T035 [US4] Handle edge case: hide pagination controls when totalPages <= 1

**Checkpoint**: User Story 4 complete - pagination navigation works (SC-006)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T036 [P] Add loading states to route transitions in `apps/postybirb-ui/src/remake/components/layout/layout.tsx`
- [ ] T037 [P] Verify all components use Mantine UI only (SC-008) - audit all layout components
- [ ] T038 Ensure layout renders correctly on 1024px+ viewports (SC-003) in `apps/postybirb-ui/src/remake/styles/layout.css`
- [ ] T039 Add translated strings using Lingui Trans/t macros to all visible labels
- [ ] T040 Run quickstart.md validation - verify all documented usage examples work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1, US2, US5 are P1 priority - implement first
  - US3, US4 are P2 priority - implement after P1 stories
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Priority | Dependencies | Can Parallelize With |
|-------|----------|--------------|---------------------|
| US1 (Navigate Sections) | P1 | Foundational | US2, US5 (partially) |
| US2 (Collapse SideNav) | P1 | US1 (SideNav exists) | US5 |
| US5 (View Content) | P1 | Foundational | US1, US2 |
| US3 (Sub-Navigation) | P2 | US1, Foundational | US4 |
| US4 (Pagination) | P2 | US5, Foundational | US3 |

### Within Each User Story

- Models/types before components
- Layout integration after component creation
- Edge cases after happy path
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T003, T004, T005 can run in parallel (different files)
```

**Phase 2 (Foundational)**:
```
T009 can run in parallel with T006-T008
```

**Phase 3 (US1)**:
```
T012, T014, T015, T016 can run in parallel (different files)
```

**Phase 4 (US2)**:
```
Tasks are sequential (same file modifications)
```

**Phase 7 (US4)**:
```
T032 can start immediately (new file)
```

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# Launch all parallelizable US1 tasks together:
Task T012: "Create NavItem component in nav-item.tsx"
Task T014: "Create HomePage in home-page.tsx"
Task T015: "Create SubmissionsPage in submissions-page.tsx"
Task T016: "Create SettingsPage in settings-page.tsx"

# Then sequentially:
Task T013: "Create SideNav component" (uses NavItem from T012)
Task T017: "Wire navigation to routes" (uses pages from T014-T016)
Task T018: "Integrate SideNav into Layout"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 5 - All P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Navigate Sections)
4. Complete Phase 4: User Story 2 (Collapse SideNav)
5. Complete Phase 5: User Story 5 (View Content)
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Demo/validate with: navigation works, collapse works, content displays properly

### Incremental Delivery (P2 Stories)

1. Add Phase 6: User Story 3 (Sub-Navigation) → Test independently
2. Add Phase 7: User Story 4 (Pagination) → Test independently
3. Complete Phase 8: Polish

### Success Criteria Mapping

| Success Criteria | User Story | Verification Task |
|-----------------|------------|-------------------|
| SC-001: Navigate 3 sections <2s | US1 | T017, T018 |
| SC-002: Single-click collapse/expand | US2 | T019 |
| SC-003: Renders on 1024px+ | All | T038 |
| SC-004: State persists on refresh | US2 | T023 |
| SC-005: Sub-nav update <500ms | US3 | T030 |
| SC-006: Single-click pagination | US4 | T034 |
| SC-007: Content scrolls independently | US5 | T025 |
| SC-008: All Mantine components | All | T037 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All component filenames use snake-case per project convention
- No references to code outside `/remake` directory
- Use Lingui (Trans, t macro) for all visible text strings
