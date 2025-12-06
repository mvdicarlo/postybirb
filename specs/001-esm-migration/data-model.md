# Data Model: ESM Migration

**Feature**: ESM Migration  
**Branch**: 001-esm-migration  
**Date**: 2025-12-05

## Overview

This ESM migration is primarily a **configuration change**, not a feature that introduces new domain entities. The "data model" consists of configuration file structures that must be modified to enable ECMAScript Modules.

## Configuration Entities

### 1. PackageJsonConfig

**Purpose**: Root and sub-project package.json files that control module system behavior

**Fields**:
- `type`: **"module"** | "commonjs" - Declares module system (ESM requires "module")
- `exports`: Optional object mapping subpath imports
- `main`: Entry point file path (should point to ESM output)
- `types`: TypeScript declaration file path
- `scripts`: Build/test commands (no changes required)
- `dependencies`: External packages (no structural changes)
- `devDependencies`: Development packages (may add ESM-related tooling)

**Relationships**:
- Located at: `/package.json` (root), `/apps/*/package.json`, `/libs/*/package.json`
- Consumed by: Node.js module loader, npm/yarn, Nx executors
- Affects: Module resolution at runtime

**Validation Rules**:
- Root package.json MUST have `"type": "module"`
- Sub-project package.json SHOULD inherit from root (omit `type` field)
- If `exports` field present, MUST include default export

**State Transitions**:
1. Initial: `type` field absent (defaults to "commonjs")
2. Migrated: `"type": "module"` added to root package.json

### 2. TsConfigConfig

**Purpose**: TypeScript compiler configuration controlling module output format

**Fields**:
- `compilerOptions.module`: **"esnext"** - Target module system
- `compilerOptions.moduleResolution`: **"bundler"** - How to resolve imports
- `compilerOptions.target`: "ES2022" - JavaScript target (affects async/await, etc.)
- `compilerOptions.esModuleInterop`: true - Allow default imports from CommonJS
- `compilerOptions.allowSyntheticDefaultImports`: true - Type checking for default imports
- `compilerOptions.emitDecoratorMetadata`: true - Required for NestJS decorators
- `compilerOptions.experimentalDecorators`: true - Enable decorator syntax
- `compilerOptions.paths`: Path alias mappings (unchanged)
- `extends`: Path to base config (unchanged)

**Relationships**:
- Located at: `/tsconfig.base.json`, `/apps/*/tsconfig.app.json`, `/libs/*/tsconfig.lib.json`
- Consumed by: TypeScript compiler (tsc), Nx executors, IDE language services
- Affects: Compilation output, import resolution, type checking

**Validation Rules**:
- `module` MUST be "esnext" (not "commonjs")
- `moduleResolution` MUST be "bundler" (not "node")
- `esModuleInterop` and `allowSyntheticDefaultImports` MUST be true
- Decorator flags MUST remain enabled for NestJS projects

**State Transitions**:
1. Initial: `"module": "commonjs"` in app/lib configs
2. Migrated: `"module": "esnext"` in all configs

### 3. JestConfigConfig

**Purpose**: Jest test framework configuration for testing ESM code

**Fields**:
- `preset`: Path to shared preset (e.g., "../../jest.preset.js")
- `testEnvironment`: "node" | "jsdom" - Test execution environment
- `transform`: Object mapping file patterns to transformers
  - `'^.+\\.[tj]s$'`: `['@swc/jest', {...}]` - SWC transformer for TS/JS
- `extensionsToTreatAsEsm`: `['.ts']` - File extensions to treat as ESM
- `moduleNameMapper`: Object mapping path aliases to actual paths
  - `'^@postybirb/(.*)$'`: `'<rootDir>/../../libs/$1/src/index.ts'`
- `testMatch`: Glob patterns for test files (unchanged)
- `coverageDirectory`: Output path for coverage reports (unchanged)

**Relationships**:
- Located at: `/jest.config.ts`, `/apps/*/jest.config.ts`, `/libs/*/jest.config.ts`
- Consumed by: Jest test runner, Nx @nx/jest executor
- Affects: Test execution, module resolution in tests, code coverage

**Validation Rules**:
- `transform` MUST use '@swc/jest' (not 'ts-jest')
- `extensionsToTreatAsEsm` MUST include '.ts'
- `moduleNameMapper` MUST map all @postybirb/* aliases to correct paths
- Root preset MUST be valid ESM file (exported as default or named export)

**State Transitions**:
1. Initial: Uses default Jest preset, no ESM-specific configuration
2. Migrated: Adds `extensionsToTreatAsEsm`, updates `transform` to @swc/jest, adds `moduleNameMapper`

### 4. NxProjectConfig

**Purpose**: Nx project.json configuration defining build/test/lint targets

**Fields**:
- `name`: Project name (unchanged)
- `sourceRoot`: Path to source files (unchanged)
- `projectType`: "application" | "library" (unchanged)
- `targets`: Object containing build/test/lint configurations
  - `build.executor`: "@nx/js:tsc" | "nx-electron:build" (unchanged)
  - `build.options.outputPath`: ESM output location (unchanged structurally)
  - `build.options.main`: Entry file path (unchanged)
  - `build.options.tsConfig`: Path to tsconfig (unchanged)
  - `build.options.format`: **"esm"** - New option for some executors
  - `test.executor`: "@nx/jest:jest" (unchanged)
  - `test.options.jestConfig`: Path to jest config (unchanged)

**Relationships**:
- Located at: `/apps/*/project.json`, `/libs/*/project.json`
- Consumed by: Nx task runner, Nx executors (build/test/lint)
- Affects: Build output format, task execution, dependency graph

**Validation Rules**:
- Build target MUST produce ESM output (verify via build.options or executor defaults)
- Output paths MUST remain unchanged (Nx cache relies on consistent structure)
- All targets MUST continue to execute successfully

**State Transitions**:
1. Initial: Executors use default module format (CommonJS from tsconfig)
2. Migrated: Executors read `"module": "esnext"` from tsconfig and output ESM

### 5. NxJsonConfig

**Purpose**: Workspace-level Nx configuration

**Fields**:
- `npmScope`: "@postybirb" (unchanged)
- `affected`: Configuration for affected command (unchanged)
- `tasksRunnerOptions`: Cache and runner configuration (unchanged)
- `targetDefaults`: Default options for build/test/lint (unchanged)
- `namedInputs`: Input patterns for cache (unchanged)

**Relationships**:
- Located at: `/nx.json`
- Consumed by: All Nx commands, Nx task runner, Nx cache
- Affects: Build caching, affected analysis, task execution defaults

**Validation Rules**:
- No structural changes required for ESM migration
- Cache invalidation handled automatically via tsconfig changes

**State Transitions**:
1. Initial: Workspace configuration unchanged
2. Migrated: No changes to nx.json (cache invalidates naturally)

## Configuration Dependency Graph

```
PackageJsonConfig (root)
  └─> Determines runtime module system (Node.js)
  
TsConfigConfig (base)
  ├─> Determines compilation module format (TypeScript)
  └─> TsConfigConfig (apps/libs) extends base
  
JestConfigConfig (preset)
  ├─> Determines test module handling (Jest)
  └─> JestConfigConfig (apps/libs) extends preset
  
NxProjectConfig (apps/libs)
  ├─> References TsConfigConfig for build
  ├─> References JestConfigConfig for test
  └─> Executed by NxJsonConfig task runner
```

## Migration Impact

### Phase 1: Libraries
- **Entities Modified**: 10x TsConfigConfig, 10x JestConfigConfig, 10x NxProjectConfig
- **Risk**: Low - libraries are internal dependencies, changes are isolated

### Phase 2: Applications
- **Entities Modified**: 1x PackageJsonConfig (root), 3x TsConfigConfig, 3x JestConfigConfig, 3x NxProjectConfig
- **Risk**: Medium - runtime behavior changes, requires full system testing

### Validation Strategy
- **Build Validation**: `nx affected:build` succeeds
- **Test Validation**: `nx affected:test` succeeds
- **Type Validation**: `nx affected:lint` (tsc type checking) succeeds
- **Runtime Validation**: Launch Electron app, verify no import failures

## Notes

- This is not a traditional "data model" with entities/relationships - it's a configuration model
- No database schema changes required (SQLite database structure unchanged)
- User-facing data models (Website, Submission, Account, etc.) are unaffected
- Domain logic remains unchanged - only module loading mechanism changes
