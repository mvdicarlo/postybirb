# Implementation Plan: ESM Migration

**Branch**: `001-esm-migration` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-esm-migration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migrate the PostyBirb Nx monorepo from CommonJS to ECMAScript Modules (ESM) to modernize the module system while ensuring all applications (Electron main process, NestJS backend, React UI) build and run successfully. The migration follows a hybrid approach: convert all shared libraries to ESM first (Phase 1), then migrate all three applications simultaneously (Phase 2). Validation occurs through existing Jest test suite after each library conversion, with feature branch isolation ensuring production stability until thorough testing confirms no regressions.

## Technical Context

**Language/Version**: TypeScript 5.8.3 with Node.js 24.6.0+  
**Primary Dependencies**: 
- **Build System**: Nx 19.8.9 (monorepo orchestration), nx-electron 19.0.0
- **Electron**: v35 (cross-platform desktop)
- **Backend**: NestJS 10.4.16, Drizzle ORM 0.44.7, better-sqlite3 12.4.1
- **Frontend**: React 18.3.1, Mantine UI 7.17.4, BlockNote 0.15.11
- **Testing**: Jest 29.7.0 with @nx/jest executor
- **Tooling**: ESLint 8.57.1, Prettier 3.x

**Storage**: SQLite3 via Drizzle ORM (local database), file system for user data  
**Testing**: Jest with project-specific configurations, `@kayahr/jest-electron-runner` for Electron tests, existing test suite provides validation  
**Target Platform**: Cross-platform desktop (Windows, macOS, Linux) via Electron  
**Project Type**: Monorepo with web architecture (Electron app + NestJS backend + React frontend)  
**Performance Goals**: Not applicable (infrastructure migration, not performance-focused)  
**Constraints**: 
- Must maintain backward compatibility with existing user data and configurations
- Must not break any of 50+ website integration implementations
- Zero downtime for development workflow (feature branch isolation)
- All existing tests must continue to pass

**Scale/Scope**: 
- 3 applications: postybirb (Electron main), client-server (NestJS backend), postybirb-ui (React frontend)
- 10 shared libraries: database, form-builder, fs, http, logger, socket-events, translations, types, utils/electron, utils/file-type
- Codebase: ~1000 TypeScript files across apps and libs
- 50+ website integrations that must continue functioning
- 7 supported languages (i18n via Lingui)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Monorepo Architecture - ✅ PASS

**Requirement**: All code organized within Nx monorepo with clear separation; apps remain independently buildable; libraries self-contained; project.json for each; acyclic dependency graph.

**Assessment**: 
- ✅ ESM migration maintains existing Nx monorepo structure
- ✅ Apps (postybirb, client-server, postybirb-ui) remain independently buildable
- ✅ Libraries maintain self-contained boundaries
- ✅ Each project keeps its project.json with build/test/lint targets
- ✅ Dependency graph remains acyclic (ESM doesn't change dependencies, only module format)
- ✅ Nx executors (nx-electron:build, @nx/jest:jest, @nx/eslint:lint) continue to function

**Verification**: `nx graph` must continue to display project relationships correctly after migration.

### II. Testing Standards - ✅ PASS

**Requirement**: Jest testing with coverage; tests colocated or in tests/ directories; `yarn test` must pass before merging.

**Assessment**:
- ✅ Jest remains the test framework
- ✅ Test organization unchanged (*.spec.ts files colocated)
- ✅ Existing test suite validates library conversions (Phase 1)
- ✅ All tests must pass before merging feature branch to main
- ✅ Jest configuration updated for ESM support (jest.config.ts modifications)
- ✅ `yarn affected:test` used for efficient validation during migration

**Verification**: SC-004 requires "All existing tests pass with `yarn test` using ESM-configured Jest"

### III. Type Safety - ✅ PASS

**Requirement**: TypeScript strict mode; explicit types; shared types in libs/types/src; no unjustified `any`; `yarn typecheck` must pass.

**Assessment**:
- ✅ TypeScript strict mode remains enabled
- ✅ ESM migration only changes module format, not type definitions
- ✅ Shared types remain in libs/types/src
- ✅ No new `any` types introduced
- ✅ TypeScript `moduleResolution` updated to "bundler" or "node16" for ESM
- ✅ Path aliases (@postybirb/*) continue to resolve with ESM

**Verification**: SC-006 requires "Type checking passes with `yarn typecheck` for all ESM imports"

### IV. Internationalization First - ✅ PASS

**Requirement**: Lingui for all translations; wrap user-facing strings with macros; run `yarn lingui:extract --clean`; keep .po files in sync.

**Assessment**:
- ✅ No changes to i18n infrastructure
- ✅ Lingui remains the translation framework
- ✅ ESM migration is infrastructure-only, no user-facing string changes
- ✅ All 7 language .po files remain unchanged
- ⚠️ Verify Lingui macros and extraction work with ESM modules

**Verification**: Lingui extraction and runtime must function correctly with ESM imports.

### V. Contribution Standards - ✅ PASS

**Requirement**: Conventional commits; Prettier formatting; linting passes; Husky hooks installed; clean code.

**Assessment**:
- ✅ Migration commits follow Conventional Commits (e.g., "build(esm): convert libs to ESM")
- ✅ Prettier formatting maintained
- ✅ ESLint updated for ESM compatibility
- ✅ Husky hooks continue to enforce pre-commit checks
- ✅ Code quality standards maintained

**Verification**: SC-005 requires "Linting completes successfully with `yarn lint` on ESM codebase"

### Summary

**Status**: ✅ **ALL GATES PASS**

No constitutional violations. The ESM migration is purely an infrastructure modernization that maintains all architectural principles, testing standards, type safety, internationalization infrastructure, and contribution practices. The migration enhances rather than degrades code quality by adopting modern JavaScript standards.

## Project Structure

### Documentation (this feature)

```text
specs/001-esm-migration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (minimal - config entities)
├── quickstart.md        # Phase 1 output (validation steps)
├── contracts/           # Phase 1 output (config file contracts)
│   ├── package.json.contract.md
│   ├── tsconfig.contract.md
│   ├── jest.config.contract.md
│   └── nx.config.contract.md
├── checklists/          # Existing - requirements checklist
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Project Type**: Nx Monorepo with Web Architecture (Electron + Backend + Frontend)

```text
postybirb/                           # Repository root
├── package.json                     # Root package.json - ADD "type": "module"
├── tsconfig.base.json               # Base TypeScript config - UPDATE module settings
├── nx.json                          # Nx workspace config - verify ESM compatibility
├── jest.config.ts                   # Root Jest config - UPDATE for ESM
├── jest.preset.js                   # Jest preset - UPDATE for ESM
├── babel.config.js                  # Babel config - verify ESM compatibility
├── .eslintrc.js                     # ESLint config - UPDATE for ESM imports
│
├── apps/
│   ├── postybirb/                   # Electron main process app
│   │   ├── project.json             # Nx project config (nx-electron:build executor)
│   │   ├── tsconfig.json            # Base config (references app/spec configs)
│   │   ├── tsconfig.app.json        # UPDATE: "module": "esnext" (Phase 2)
│   │   ├── tsconfig.spec.json       # UPDATE for ESM tests
│   │   ├── jest.config.ts           # UPDATE for ESM
│   │   └── src/
│   │       ├── main.ts              # Electron entry point - CONVERT to ESM imports
│   │       └── app/                 # Application code - CONVERT to ESM
│   │
│   ├── client-server/               # NestJS backend app
│   │   ├── project.json             # Nx project config
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json        # UPDATE: "module": "esnext" (Phase 2)
│   │   ├── tsconfig.spec.json       # UPDATE for ESM tests
│   │   ├── jest.config.ts           # UPDATE for ESM
│   │   └── src/
│   │       ├── main.ts              # NestJS entry point - CONVERT to ESM imports
│   │       └── app/                 # Backend code including 50+ website integrations
│   │
│   └── postybirb-ui/                # React frontend app
│       ├── project.json             # Nx project config
│       ├── tsconfig.json
│       ├── tsconfig.app.json        # UPDATE: "module": "esnext" (Phase 2)
│       ├── tsconfig.spec.json       # UPDATE for ESM tests
│       ├── jest.config.ts           # UPDATE for ESM
│       ├── vite.config.ts           # Vite already ESM-compatible
│       └── src/
│           └── app/                 # React UI code
│
├── libs/                            # Shared libraries (Phase 1 - convert these FIRST)
│   ├── database/
│   │   ├── project.json
│   │   ├── tsconfig.json            # UPDATE: "module": "esnext"
│   │   ├── tsconfig.lib.json        # UPDATE: "module": "esnext"
│   │   ├── tsconfig.spec.json       # UPDATE for ESM tests
│   │   ├── jest.config.ts           # UPDATE for ESM
│   │   └── src/
│   │       └── index.ts             # Library entry point - CONVERT to ESM exports
│   │
│   ├── form-builder/                # Repeat structure for each library
│   ├── fs/
│   ├── http/
│   ├── logger/
│   ├── socket-events/
│   ├── translations/
│   ├── types/
│   ├── utils/
│   │   ├── electron/
│   │   └── file-type/
│   └── [all libs follow same pattern]
│
└── scripts/
    ├── package.json                 # Already has "type": "module"
    └── tsconfig.json                # Already uses "module": "Node18"
```

**Structure Decision**: Nx monorepo with 3 applications and 10 shared libraries. The migration modifies **configuration files only** (package.json, tsconfig.json files, jest.config.ts files, project.json files). Source code import/export syntax remains largely unchanged (extensionless imports, build tools handle resolution). No new directories or files are created; only module format configurations are updated.

**Migration Order**:
1. **Phase 1**: Convert all 10 libraries in libs/ to ESM (tsconfig updates, verify with tests)
2. **Phase 2**: Convert all 3 applications in apps/ to ESM simultaneously

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations identified. This section intentionally left empty.
