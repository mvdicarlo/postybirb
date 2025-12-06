# Feature Specification: ESM Migration

**Feature Branch**: `001-esm-migration`  
**Created**: 2025-12-05  
**Status**: Draft  
**Input**: User description: "As a developer, I want to migrate this CommonJS NxJS monorepo to the more modern ESM. It must still successfully build the postybirb electron application without issue or import failure"

## Clarifications

### Session 2025-12-05

- Q: Should this be a "big bang" migration (everything at once) or an incremental migration (one app/library at a time)? → A: Hybrid approach - Convert all libraries first, then apps all at once
- Q: During the library migration phase (before apps are converted), how should library ESM compatibility be validated to ensure apps can still import them? → A: Run Nx tests across all apps/libs. We already have tests that should catch a breakage.
- Q: If the migration causes unexpected runtime issues after deployment, what is the rollback strategy? → A: No explicit rollback - Fix forward only, ESM migration is one-way. This will be isolated to a feature branch and not merged into main until thorough testing is done and verified nothing broke.
- Q: Success Criterion SC-008 states "Build time remains within 10% of current CommonJS build time" - what is the current baseline build time to measure against? → A: Build time is not a relevant metric here
- Q: Should TypeScript source files use `.js` extensions in imports (pointing to the compiled output) or rely on TypeScript's resolution and bundler handling? → A: Bundler-based resolution - Extensionless imports in .ts files, build tools handle it

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Build System Migration (Priority: P1)

As a developer, I want the build system to use native ESM throughout the monorepo so that all applications (postybirb Electron app, client-server backend, and postybirb-ui frontend) compile successfully without CommonJS compatibility issues.

**Why this priority**: This is the foundational change. Without a working build system, no other ESM benefits can be realized. The Electron application must build and launch successfully for PostyBirb to remain functional.

**Independent Test**: Run `yarn build:prod` and verify all three applications compile without errors. Launch the built Electron application and verify it starts without module import failures.

**Acceptance Scenarios**:

1. **Given** the monorepo has package.json with `"type": "module"`, **When** running `yarn build`, **Then** all apps compile successfully without CommonJS errors
2. **Given** ESM configuration is applied, **When** running `yarn build:prod`, **Then** production builds complete and Electron installer can be created
3. **Given** the built application, **When** launching PostyBirb.exe, **Then** the application starts without "Cannot use import statement outside a module" errors
4. **Given** ESM imports throughout codebase, **When** Electron loads the main process, **Then** all `@postybirb/*` path aliases resolve correctly

---

### User Story 2 - Library Module Format Standardization (Priority: P2)

As a developer, I want all shared libraries in the monorepo to use ESM format so that there are no mixed module format issues between CommonJS and ESM code.

**Why this priority**: Consistent module format across libraries prevents runtime import errors and enables tree-shaking for better bundle sizes. This must be completed after the core build works but before additional tooling updates.

**Independent Test**: Build each library independently using `yarn nx build <library>` and verify all exports are ESM format. Import a library function in a test file using ESM syntax and verify it resolves.

**Acceptance Scenarios**:

1. **Given** all libraries have tsconfig with `"module": "esnext"`, **When** building any library, **Then** output uses ESM export syntax
2. **Given** ESM library outputs, **When** importing from another app/library, **Then** imports work without require() compatibility layers
3. **Given** the @postybirb/* path aliases, **When** using ESM imports, **Then** TypeScript and runtime both resolve paths correctly
4. **Given** mixed ESM and external CommonJS dependencies, **When** building, **Then** build tools handle interop correctly

---

### User Story 3 - Development Tooling Compatibility (Priority: P3)

As a developer, I want all development tools (Jest, ESLint, Nx) to work seamlessly with ESM so that testing, linting, and monorepo management continue to function correctly.

**Why this priority**: Development workflow must not be disrupted. This is lower priority because it doesn't affect end-users, but it's critical for maintainability.

**Independent Test**: Run `yarn test`, `yarn lint`, and `yarn affected:test` and verify all pass without ESM-related configuration errors.

**Acceptance Scenarios**:

1. **Given** ESM codebase, **When** running `yarn test`, **Then** Jest executes all tests successfully with ESM support
2. **Given** ESM module imports, **When** running `yarn lint`, **Then** ESLint validates code without module format errors
3. **Given** Nx configuration, **When** running `yarn affected:test`, **Then** Nx correctly detects affected projects in ESM format
4. **Given** TypeScript strict mode, **When** running `yarn typecheck`, **Then** type checking passes for ESM imports
5. **Given** ESM build outputs, **When** running `nx graph`, **Then** dependency graph correctly visualizes ESM import relationships
6. **Given** modified ESM file, **When** running `nx affected:build`, **Then** Nx identifies only affected projects based on ESM imports

---

### User Story 4 - Nx Build System Integration (Priority: P1)

As a developer, I want Nx build executors and caching to work seamlessly with ESM so that the monorepo build system remains performant and the dependency graph accurately reflects project relationships.

**Why this priority**: Nx is the backbone of the monorepo build orchestration. If Nx executors fail or caching breaks, the entire development workflow becomes unusable. This is elevated to P1 because it's critical infrastructure alongside the core build.

**Independent Test**: Run `nx build client-server`, `nx build postybirb`, verify outputs are ESM format. Run builds twice and verify second build uses cache. Modify one library, run `nx affected:build`, verify only affected projects rebuild.

**Acceptance Scenarios**:

1. **Given** Nx workspace with ESM, **When** running `nx build postybirb`, **Then** nx-electron:build executor produces ESM-compatible Electron bundle
2. **Given** ESM build outputs in cache, **When** running build with no changes, **Then** Nx serves results from cache (>80% cache hit rate)
3. **Given** dependency graph in ESM, **When** running `nx graph`, **Then** all @postybirb/* library imports are correctly visualized
4. **Given** changed library file, **When** running `nx affected:build`, **Then** only dependent apps/libs rebuild, proving correct ESM dependency tracking
5. **Given** parallel build execution, **When** running `nx run-many -t build`, **Then** all projects build in parallel without ESM import race conditions

---

### Edge Cases

- What happens when external dependencies only provide CommonJS builds? (Handle via ESM interop)
- How does the system handle Electron's dual context (main process vs renderer)? (Verify both use ESM)
- What happens when native Node modules (like better-sqlite3) are imported? (Ensure ESM wrapper compatibility)
- How does Jest handle ESM + TypeScript path aliases? (Configure jest.config.ts with proper ESM resolvers)
- What happens with dynamic imports in Electron main process? (Test that `import()` works for lazy loading)
- How do Nx project.json build configurations need to change? (Update build targets to output ESM)
- What happens when Nx cache contains CommonJS outputs? (Clear cache or handle mixed output formats)
- How does nx-electron:build executor handle ESM entry points? (Verify main.ts ESM imports work)
- What happens with Nx target dependencies when mixing ESM and CommonJS during migration? (Validate dependsOn chains)
- How does Nx handle path mapping resolution in ESM context? (Test @postybirb/* aliases through Nx builds)
- What happens to Nx task runner performance with ESM? (Benchmark parallel execution)
- How do Nx generators work with ESM project structure? (Verify scaffold commands still function)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add `"type": "module"` to root package.json to enable ESM by default
- **FR-002**: All TypeScript configurations MUST use `"module": "esnext"` or `"module": "ES2022"` instead of `"commonjs"`
- **FR-003**: All import statements MUST use ESM syntax (`import`/`export`); TypeScript source files use extensionless imports, relying on build tools for resolution
- **FR-004**: Nx build configurations MUST output ESM-compatible bundles for all applications
- **FR-005**: Jest configuration MUST support ESM execution with proper transform and resolver settings
- **FR-006**: Electron main process MUST load ESM entry point successfully
- **FR-007**: All `@postybirb/*` path aliases MUST resolve correctly in ESM context using import maps or proper TypeScript configuration
- **FR-008**: Package.json exports field MUST be configured to expose library entry points as ESM
- **FR-009**: Build output MUST maintain compatibility with Electron bundler and installer creation
- **FR-010**: TypeScript path resolution (`moduleResolution`) MUST be set to `"bundler"` or `"node16"` to support ESM imports
- **FR-011**: All dynamic requires (if any exist) MUST be converted to dynamic imports (`import()`)
- **FR-012**: Import statements in TypeScript source use extensionless format (e.g., `import { foo } from './bar'`); build tools (Nx, TypeScript compiler, bundlers) handle proper resolution and output formatting
- **FR-013**: Nx executors (nx-electron:build, @nx/jest:jest, @nx/eslint:lint) MUST successfully process ESM code
- **FR-014**: Nx build cache MUST remain functional with ESM outputs (cache invalidation working correctly)
- **FR-015**: Nx dependency graph (`nx graph`) MUST correctly detect imports between ESM modules
- **FR-016**: Nx affected commands (`nx affected:build`, `nx affected:test`) MUST work with ESM project structure
- **FR-017**: nx-electron:build executor MUST output ESM-compatible bundles that Electron can load
- **FR-018**: Nx task orchestration (`dependsOn`, build order) MUST work correctly with ESM library builds

### Nx Build System Requirements

These requirements ensure the Nx monorepo infrastructure remains fully functional:

- **NX-001**: All Nx executors defined in project.json files MUST successfully process ESM code without configuration errors
- **NX-002**: Nx build cache MUST correctly invalidate when ESM source files or dependencies change
- **NX-003**: Nx dependency graph computation MUST parse ESM import/export statements to determine project relationships
- **NX-004**: Nx affected commands MUST use ESM import analysis to identify which projects are impacted by changes
- **NX-005**: Path mapping resolution (@postybirb/* aliases) MUST work through Nx build system with ESM modules
- **NX-006**: nx-electron:build executor MUST support ESM entry points (main.ts) and output ESM bundles
- **NX-007**: Nx parallel task execution (multiple builds) MUST not have race conditions with ESM module loading
- **NX-008**: Nx project.json configurations MAY need updated executor options for ESM output formats
- **NX-009**: Nx generators (for creating new libs/apps) SHOULD generate ESM-compatible scaffolding after migration

### Assumptions

- Node.js version 24.6.0+ already supports ESM natively (confirmed in README requirements)
- Nx version 19.8.9 supports ESM monorepo builds (confirmed in package.json)
- Nx executors (nx-electron, @nx/jest, @nx/eslint, @nx/js) support ESM output formats
- Electron v35 supports ESM in main process (confirmed in package.json)
- External dependencies (NestJS, React, etc.) are ESM-compatible or provide ESM builds
- Drizzle ORM and better-sqlite3 can be used in ESM context with proper configuration
- Nx build cache mechanism works correctly with ESM module outputs
- TypeScript path mapping (@postybirb/*) is resolved by Nx build system in ESM mode

### Migration Strategy

**Approach**: Hybrid migration - All libraries converted to ESM first, then all applications converted together

**Phase 1 - Library Migration**: Convert all shared libraries (@postybirb/database, @postybirb/form-builder, @postybirb/fs, @postybirb/http, @postybirb/logger, @postybirb/socket-events, @postybirb/translations, @postybirb/types, @postybirb/utils/*) to ESM format. Libraries can remain consumable by CommonJS apps during this phase using proper interop configuration.

**Phase 1 Validation**: After converting each library, run `yarn test` (or `nx affected:test`) to verify existing tests pass. The existing test suite will catch any breaking changes in library exports or import compatibility.

**Phase 2 - Application Migration**: Once all libraries are ESM, convert all three applications (postybirb, client-server, postybirb-ui) to ESM simultaneously. This ensures consistent module format across the entire application layer.

**Phase 2 Validation**: Complete thorough testing including all unit tests, integration tests, manual QA of core workflows, and validation that the Electron application builds and runs correctly. No merge to main until all verification passes.

**Rollback Strategy**: Fix-forward only. The migration will remain on the feature branch (`001-esm-migration`) until all testing confirms no regressions. Only after verification will it merge to main, eliminating the need for rollback procedures.

**Rationale**: This hybrid approach ensures the foundational libraries are stable in ESM before touching application code, while avoiding the complexity of managing mixed ESM/CommonJS at the application layer. Existing tests provide validation at each step. Feature branch isolation ensures production stability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three applications (postybirb, client-server, postybirb-ui) build successfully with `yarn build` producing ESM output
- **SC-002**: Production build completes with `yarn build:prod` and Electron installers are generated without errors
- **SC-003**: Launched Electron application starts and runs without module format errors or import failures
- **SC-004**: All existing tests pass with `yarn test` using ESM-configured Jest
- **SC-005**: Linting completes successfully with `yarn lint` on ESM codebase
- **SC-006**: Type checking passes with `yarn typecheck` for all ESM imports
- **SC-007**: Development mode (`yarn start`) launches all applications successfully
- **SC-008**: All website integration implementations continue to work without modification
- **SC-009**: Zero "require is not defined" or "Cannot use import statement outside a module" runtime errors
- **SC-010**: Nx dependency graph (`nx graph`) correctly visualizes all ESM import relationships between projects
- **SC-011**: Nx build cache hit rate remains above 80% after ESM migration (cache effectiveness maintained)
- **SC-012**: Nx affected commands correctly identify changed projects based on ESM imports
- **SC-013**: All Nx executors (nx-electron:build, @nx/jest:jest, @nx/eslint:lint, @nx/js:node) complete without ESM-related errors
- **SC-014**: Nx parallel task execution works correctly with ESM builds (no race conditions or import failures)
