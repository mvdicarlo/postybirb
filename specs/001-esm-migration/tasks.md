# Tasks: ESM Migration

**Input**: Design documents from `/specs/001-esm-migration/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: No new tests required - existing test suite provides validation (per spec.md clarifications)

**Organization**: Tasks grouped by migration phase (Setup → Libraries → Applications → Polish)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Core Build, US2=Libraries, US3=Tooling, US4=Nx Integration)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare build infrastructure for ESM migration

- [x] T001 Clear Nx cache to ensure clean slate with `nx reset`
- [x] T002 [P] Install @swc/jest as dev dependency for ESM test transformation in package.json
- [x] T003 [P] Verify Node.js version is 24.6.0+ with `node --version`

**Checkpoint**: Infrastructure ready for library migration

---

## Phase 2: Foundational (Root Configuration)

**Purpose**: Update root-level configuration files that affect all projects

**⚠️ CRITICAL**: Complete this phase before library migration begins

- [x] T004 [US1] Update tsconfig.base.json: set `"module": "esnext"`, `"moduleResolution": "bundler"`, verify `esModuleInterop: true`
- [x] T005 [P] [US3] Convert jest.preset.js to ESM format with `export default` and @swc/jest transformer
- [x] T006 [P] [US3] Update root jest.config.ts: add `extensionsToTreatAsEsm: ['.ts']`
- [x] T007 [P] [US3] Verify .eslintrc.js is compatible with ESM imports (no structural changes expected)
- [x] T008 [US4] Verify nx.json is compatible (no changes needed, cache invalidates automatically)

**Checkpoint**: Root configuration ready - library migration can begin

---

## Phase 3: User Story 2 - Library Module Format Standardization (Priority: P2)

**Goal**: Convert all 10 shared libraries to ESM format

**Independent Test**: Run `nx affected:test` after each library conversion to verify no regressions

### Library 1: types (No Dependencies)

- [x] T009 [P] [US2] Update libs/types/tsconfig.lib.json: set `"module": "esnext"`
- [x] T010 [P] [US2] Update libs/types/jest.config.ts: add ESM configuration and moduleNameMapper

### Library 2: logger (Depends on types)

- [x] T011 [P] [US2] Update libs/logger/tsconfig.lib.json: set `"module": "esnext"`
- [x] T012 [P] [US2] Update libs/logger/jest.config.ts: add ESM configuration and moduleNameMapper

### Library 3: socket-events (Depends on types)

- [x] T013 [P] [US2] Update libs/socket-events/tsconfig.lib.json: set `"module": "esnext"`

### Library 4: translations (Depends on types)

- [x] T014 [P] [US2] Update libs/translations/tsconfig.lib.json: set `"module": "esnext"`

### Library 5: http (Depends on types, logger)

- [x] T015 [P] [US2] Update libs/http/tsconfig.lib.json: set `"module": "esnext"`
- [x] T016 [P] [US2] Update libs/http/jest.config.ts: add ESM configuration and moduleNameMapper

### Library 6: fs (Depends on types, logger)

- [x] T017 [P] [US2] Update libs/fs/tsconfig.lib.json: set `"module": "esnext"`
- [x] T018 [P] [US2] Update libs/fs/jest.config.ts: add ESM configuration and moduleNameMapper

### Library 7: database (Depends on types, logger, fs)

- [x] T019 [P] [US2] Update libs/database/tsconfig.lib.json: set `"module": "esnext"`
- [x] T020 [P] [US2] Update libs/database/jest.config.ts: add ESM configuration and moduleNameMapper

### Library 8: form-builder (Depends on types)

- [x] T021 [P] [US2] Update libs/form-builder/tsconfig.lib.json: set `"module": "esnext"`
- [x] T022 [P] [US2] Update libs/form-builder/jest.config.ts: add ESM configuration and moduleNameMapper

### Library 9: utils/electron (Depends on types)

- [x] T023 [P] [US2] Update libs/utils/electron/tsconfig.lib.json: set `"module": "esnext"`
- [x] T024 [P] [US2] Update libs/utils/electron/jest.config.ts: add ESM configuration and moduleNameMapper

### Library 10: utils/file-type (Depends on types)

- [x] T025 [P] [US2] Update libs/utils/file-type/tsconfig.lib.json: set `"module": "esnext"`
- [x] T026 [P] [US2] Update libs/utils/file-type/jest.config.ts: add ESM configuration and moduleNameMapper

### Library Validation

- [x] T027 [US2] Run `nx affected:test` to verify all library tests pass with ESM configuration
- [x] T028 [US2] Run `nx affected:build` to verify all libraries build with ESM output
- [x] T029 [US4] Run `nx graph` to verify dependency graph correctly parses ESM imports

**Checkpoint**: All libraries converted to ESM and validated

---

## Phase 4: User Story 1 - Core Build System Migration (Priority: P1) 🎯 MVP

**Goal**: Convert all 3 applications to ESM and enable runtime ESM loading

**Independent Test**: Run `yarn build` and launch Electron app to verify no import failures

### Enable Runtime ESM

- [x] T030 [US1] Add `"type": "module"` to root package.json

### Application 1: postybirb (Electron Main Process)

- [x] T031 [P] [US1] Update apps/postybirb/tsconfig.app.json: set `"module": "esnext"`
- [x] T032 [P] [US1] Update apps/postybirb/tsconfig.spec.json: set `"module": "esnext"`
- [x] T033 [P] [US1] Update apps/postybirb/jest.config.ts: add ESM configuration and moduleNameMapper for all @postybirb/* aliases

### Application 2: client-server (NestJS Backend)

- [x] T034 [P] [US1] Update apps/client-server/tsconfig.app.json: set `"module": "esnext"`, verify `emitDecoratorMetadata: true`
- [x] T035 [P] [US1] Update apps/client-server/tsconfig.spec.json: set `"module": "esnext"`
- [x] T036 [P] [US1] Update apps/client-server/jest.config.ts: add ESM configuration and moduleNameMapper for all @postybirb/* aliases

### Application 3: postybirb-ui (React Frontend)

- [x] T037 [P] [US1] Update apps/postybirb-ui/tsconfig.app.json: set `"module": "esnext"`
- [x] T038 [P] [US1] Update apps/postybirb-ui/tsconfig.spec.json: set `"module": "esnext"`
- [x] T039 [P] [US1] Update apps/postybirb-ui/jest.config.ts: add ESM configuration and moduleNameMapper for all @postybirb/* aliases

**Checkpoint**: All applications converted to ESM

---

## Phase 5: User Story 4 - Nx Build System Integration (Priority: P1)

**Goal**: Validate Nx executors, caching, and affected commands work with ESM

**Independent Test**: Run Nx commands and verify cache hits on second run

### Nx Validation

- [x] T040 [US4] Run `nx build postybirb` and verify nx-electron:build executor outputs ESM bundle
- [x] T041 [US4] Run `nx build client-server` and verify @nx/js:tsc outputs ESM format
- [x] T042 [US4] Run `nx build postybirb-ui` and verify Vite outputs ESM bundle
- [x] T043 [US4] Run builds again and verify Nx cache hit (>80% cache effectiveness)
- [x] T044 [US4] Modify a library file, run `nx affected:build`, verify only dependents rebuild

**Checkpoint**: Nx build system fully validated with ESM

---

## Phase 6: User Story 3 - Development Tooling Compatibility (Priority: P3)

**Goal**: Verify all development tools work correctly with ESM

**Independent Test**: Run `yarn test`, `yarn lint`, `yarn typecheck` and verify all pass

### Tooling Validation

- [x] T045 [US3] Run `yarn test` (or `nx run-many -t test`) and verify all tests pass
- [x] T046 [US3] Run `yarn lint` (or `nx run-many -t lint`) and verify no ESM-related errors
- [x] T047 [US3] Run `yarn typecheck` (or `nx run-many -t typecheck`) and verify type checking passes
- [x] T048 [US3] Run `yarn start` (or `nx serve postybirb`) and verify dev mode launches successfully

**Checkpoint**: Development tooling fully validated

---

## Phase 7: User Story 1 - Production Validation (Priority: P1)

**Goal**: Validate production builds and Electron application startup

**Independent Test**: Build production installer and launch application

### Production Build Validation

- [x] T049 [US1] Run `yarn build:prod` and verify all production builds complete
- [x] T050 [US1] Launch built Electron application and verify no "require is not defined" errors
- [x] T051 [US1] Verify @postybirb/* path aliases resolve correctly at runtime
- [x] T052 [US1] Test a website integration to verify 50+ integrations still function
- [x] T053 [US1] Verify database operations work (Drizzle ORM + better-sqlite3 in ESM)

**Checkpoint**: Production application validated

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T054 [P] Run full quickstart.md validation checklist
- [x] T055 [P] Verify all 14 success criteria from spec.md are met
- [x] T056 [P] Update README.md if any setup instructions changed
- [x] T057 [P] Run `nx graph` and screenshot for PR documentation
- [x] T058 Commit all changes with message: `build(esm): migrate monorepo from CommonJS to ESM`

**Checkpoint**: ESM migration complete - ready for PR review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - root configs must be updated first
- **Phase 3 (Libraries)**: Depends on Phase 2 - tsconfig.base.json must be ESM before libs
- **Phase 4 (Applications)**: Depends on Phase 3 - all libs must be ESM before apps
- **Phase 5 (Nx Validation)**: Depends on Phase 4 - apps must be built to validate Nx
- **Phase 6 (Tooling)**: Depends on Phase 4 - apps must be converted before tooling validation
- **Phase 7 (Production)**: Depends on Phase 5 & 6 - builds and tools must work first
- **Phase 8 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US2 (Libraries)**: Can start after Phase 2 - No dependencies on other user stories
- **US1 (Core Build)**: Depends on US2 (libraries must be ESM first)
- **US4 (Nx Integration)**: Depends on US1 (apps must be built to validate Nx)
- **US3 (Tooling)**: Depends on US1 (apps must be converted before tooling validation)

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
```bash
# These tasks can run in parallel:
T005 # jest.preset.js
T006 # jest.config.ts
T007 # .eslintrc.js
```

**Within Phase 3 (Libraries)**:
```bash
# All library updates can run in parallel since they're different files:
T009-T026 # All library tsconfig and jest.config updates
```

**Within Phase 4 (Applications)**:
```bash
# All app updates can run in parallel since they're different files:
T031-T033 # postybirb
T034-T036 # client-server
T037-T039 # postybirb-ui
```

**Within Phase 8 (Polish)**:
```bash
# These validation tasks can run in parallel:
T054 # quickstart validation
T055 # success criteria check
T056 # README update
T057 # nx graph screenshot
```

---

## Implementation Strategy

### MVP First (Phase 1-5)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational configs (T004-T008)
3. Complete Phase 3: All libraries to ESM (T009-T029)
4. Complete Phase 4: All applications to ESM (T030-T039)
5. Complete Phase 5: Validate Nx works (T040-T044)
6. **STOP and VALIDATE**: Run `yarn build` and `yarn test`
7. If passing, ESM migration is functionally complete

### Full Validation

1. Complete Phase 6: Verify tooling (T045-T048)
2. Complete Phase 7: Verify production (T049-T053)
3. Complete Phase 8: Polish and document (T054-T058)

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 58 |
| **Setup Tasks** | 3 (Phase 1) |
| **Foundational Tasks** | 5 (Phase 2) |
| **Library Tasks** | 21 (Phase 3, US2) |
| **Application Tasks** | 10 (Phase 4, US1) |
| **Nx Validation Tasks** | 5 (Phase 5, US4) |
| **Tooling Tasks** | 4 (Phase 6, US3) |
| **Production Tasks** | 5 (Phase 7, US1) |
| **Polish Tasks** | 5 (Phase 8) |
| **Parallel Opportunities** | 40+ tasks marked [P] |
| **MVP Scope** | Phases 1-5 (44 tasks) |

### Independent Test Criteria per User Story

| Story | Test Criteria |
|-------|--------------|
| US1 (Core Build) | `yarn build` succeeds, Electron app launches without errors |
| US2 (Libraries) | `nx affected:test` passes after each library conversion |
| US3 (Tooling) | `yarn test`, `yarn lint`, `yarn typecheck` all pass |
| US4 (Nx Integration) | `nx graph` shows correct deps, cache hits on second build |

---

## Notes

- All tasks follow strict format: `- [ ] [ID] [P?] [Story?] Description with file path`
- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to user story for traceability
- Commit after each phase or logical group
- Run validation tests after each phase checkpoint
- Feature branch (`001-esm-migration`) isolation ensures production stability
- No merge to main until all 14 success criteria pass
