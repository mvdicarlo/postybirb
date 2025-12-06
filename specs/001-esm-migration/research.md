# Research: ESM Migration

**Feature**: ESM Migration  
**Branch**: 001-esm-migration  
**Date**: 2025-12-05

## Purpose

This document consolidates research findings for migrating the PostyBirb Nx monorepo from CommonJS to ECMAScript Modules (ESM). All technical unknowns from the Technical Context have been researched and resolved.

## Research Tasks

### 1. Nx 19.8.9 ESM Support

**Question**: Does Nx 19.8.9 fully support ESM in monorepo builds?

**Decision**: ✅ Yes, Nx 19.8.9 supports ESM

**Rationale**: 
- Nx 19.x series has mature ESM support for TypeScript projects
- The `@nx/js` and `@nx/node` executors handle both CommonJS and ESM outputs
- Nx dependency graph computation works with ESM import/export syntax
- The `nx-electron` executor (v19.0.0) supports ESM entry points

**Evidence**:
- Nx official documentation confirms ESM support since v15+
- TypeScript path mapping works with `moduleResolution: "bundler"` or `"node16"`
- The affected command analysis parses ESM imports correctly

**Alternatives Considered**:
- Waiting for Nx 20.x: Rejected - 19.8.9 is sufficient and stable
- Using custom executors: Rejected - built-in executors handle ESM

### 2. Electron v35 ESM Compatibility

**Question**: Does Electron v35 support ESM in the main process?

**Decision**: ✅ Yes, Electron v35 supports ESM in main process

**Rationale**:
- Electron has supported ESM since v28 when using Node.js 16+ runtime
- package.json `"type": "module"` enables ESM for main process
- Dynamic imports work for lazy loading modules
- Renderer process already uses ESM via bundlers (Vite)

**Evidence**:
- Electron v35 uses Node.js 20+, which has native ESM support
- Main process can use `.mjs` extensions or `"type": "module"`
- Import maps and path aliases work through TypeScript compilation

**Alternatives Considered**:
- Keeping main process as CommonJS: Rejected - creates mixed module formats
- Using experimental loaders: Rejected - native ESM support is stable

### 3. NestJS ESM Compatibility

**Question**: Does NestJS 10.4.16 work with ESM?

**Decision**: ✅ Yes, NestJS 10.x supports ESM with configuration

**Rationale**:
- NestJS decorators work with ESM when `emitDecoratorMetadata: true`
- TypeScript compilation to ESM preserves decorator functionality
- Dependency injection continues to function correctly
- All NestJS modules can be imported using ESM syntax

**Configuration Required**:
```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

**Alternatives Considered**:
- Using SWC for faster builds: Deferred - stick with tsc for this migration
- Custom webpack configuration: Rejected - Nx handles bundling

### 4. Jest ESM Configuration

**Question**: How should Jest be configured to test ESM code in an Nx monorepo?

**Decision**: Configure Jest with ESM support using `@swc/jest` transformer

**Rationale**:
- Jest 29.7.0 has native ESM support (experimental but stable)
- SWC transformer handles TypeScript + ESM faster than ts-jest
- Nx's @nx/jest executor supports ESM configuration
- Path aliases require custom resolver or tsconfig-paths

**Configuration Pattern**:
```typescript
// jest.config.ts
export default {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', { /* swc options */ }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@postybirb/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
};
```

**Alternatives Considered**:
- Using ts-jest: Slower, but considered as fallback if SWC issues arise
- Babel transformer: Rejected - SWC is faster and Nx-recommended
- Vitest: Rejected - would require changing test framework

### 5. TypeScript Module Resolution Strategy

**Question**: Should `moduleResolution` be set to `"bundler"`, `"node16"`, or `"nodenext"`?

**Decision**: Use `"bundler"` for libraries and apps

**Rationale**:
- "bundler" mode designed for build-tool-based workflows (Nx, webpack, Vite)
- Handles path aliases (@postybirb/*) without requiring .js extensions
- Works with both Node.js and browser environments
- Nx executors are bundler-based, not pure Node.js execution

**Configuration**:
```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

**Alternatives Considered**:
- "node16"/"nodenext": Rejected - requires .js extensions in imports, breaks path aliases
- "node": Rejected - legacy resolution, doesn't understand ESM properly

### 6. Better-sqlite3 ESM Compatibility

**Question**: Does the better-sqlite3 native module work with ESM?

**Decision**: ✅ Yes, better-sqlite3 v12.4.1 supports ESM

**Rationale**:
- Native modules work with ESM through proper import syntax
- The module exports ESM-compatible entry point
- Works with both `import` and dynamic `import()`
- Drizzle ORM handles the module loading correctly

**Import Pattern**:
```typescript
import Database from 'better-sqlite3';
// or
const Database = (await import('better-sqlite3')).default;
```

**Alternatives Considered**:
- Alternative SQLite library: Rejected - better-sqlite3 is performant and proven
- Workaround with require(): Rejected - defeats purpose of ESM migration

### 7. Drizzle ORM ESM Support

**Question**: Does Drizzle ORM 0.44.7 work with ESM?

**Decision**: ✅ Yes, Drizzle ORM is ESM-native

**Rationale**:
- Drizzle ORM is built with ESM as the primary module format
- All exports use ESM syntax natively
- Works seamlessly with better-sqlite3 in ESM context
- Migration files can use ESM imports

**Evidence**:
- Drizzle's package.json has proper "exports" field for ESM
- TypeScript types work correctly with ESM imports
- No special configuration needed beyond standard ESM setup

**Alternatives Considered**:
- None - Drizzle is already ESM-compatible

### 8. Path Alias Resolution (@postybirb/*)

**Question**: How do TypeScript path aliases work in ESM context with Nx builds?

**Decision**: Path aliases continue to work with proper tsconfig and build tool configuration

**Rationale**:
- TypeScript compiler resolves path aliases at compile time
- Nx build executors handle path resolution for bundled outputs
- Runtime doesn't see path aliases (they're compiled to relative/absolute paths)
- Jest needs moduleNameMapper for test execution

**Configuration Requirements**:
- `tsconfig.base.json`: Keep existing paths configuration
- `jest.config.ts`: Add moduleNameMapper for each @postybirb/* alias
- Nx executors: No changes needed (handle automatically)

**Alternatives Considered**:
- Removing path aliases: Rejected - would break existing imports
- Using import maps: Rejected - not needed with build tools
- Subpath imports (package.json imports field): Rejected - unnecessary complexity

### 9. Nx Cache with ESM Outputs

**Question**: Does Nx build cache work correctly when outputs switch from CommonJS to ESM?

**Decision**: Clear cache once during migration, then cache works normally

**Rationale**:
- Cache keys include configuration hashes (tsconfig, project.json)
- When module format changes, cache automatically invalidates
- One-time cache clear (`nx reset`) ensures clean migration
- Subsequent builds cache ESM outputs correctly

**Action Required**:
- Run `nx reset` before starting Phase 2 (app migration)
- Or let natural cache invalidation occur (slightly slower first build)

**Alternatives Considered**:
- Manual cache management: Rejected - Nx handles automatically
- Disabling cache during migration: Rejected - unnecessary, slows builds

### 10. Lingui i18n with ESM

**Question**: Does Lingui's macro system work with ESM modules?

**Decision**: ✅ Yes, Lingui v5.5 supports ESM

**Rationale**:
- Lingui macros are compile-time transformations (Babel/SWC)
- Vite plugin (@lingui/vite-plugin) is ESM-compatible
- Message extraction (`yarn lingui:extract`) works with ESM source files
- Runtime catalog loading supports ESM imports

**Evidence**:
- Lingui v5.x is ESM-first
- SWC plugin (@lingui/swc-plugin) handles transformation in ESM context
- No special configuration needed beyond existing setup

**Alternatives Considered**:
- None - Lingui is already ESM-ready

## Summary of Decisions

| Area | Decision | Impact |
|------|----------|--------|
| Nx Support | ✅ Nx 19.8.9 supports ESM | No Nx upgrade needed |
| Electron ESM | ✅ v35 supports main process ESM | Use "type": "module" in package.json |
| NestJS ESM | ✅ v10.4.16 works with ESM | Keep decorator metadata enabled |
| Jest Configuration | Configure with @swc/jest + extensionsToTreatAsEsm | Update all jest.config.ts files |
| Module Resolution | Use "bundler" for all projects | Update all tsconfig files |
| better-sqlite3 | ✅ v12.4.1 supports ESM | Use standard import syntax |
| Drizzle ORM | ✅ Native ESM support | No changes needed |
| Path Aliases | Continue working with proper config | Keep tsconfig paths, add Jest mappers |
| Nx Cache | Clear once, then works normally | Run `nx reset` during migration |
| Lingui i18n | ✅ v5.5 supports ESM | No changes to i18n workflow |

## Implementation Confidence

**Overall Assessment**: ✅ **HIGH CONFIDENCE**

All major dependencies and tools support ESM. No blockers identified. The migration is straightforward configuration changes with existing test suite providing validation. Feature branch isolation ensures safety.

**Risk Areas**:
- ⚠️ Edge case: Some external dependencies might only provide CommonJS - handle with ESM interop
- ⚠️ Electron main/renderer context boundary - verify IPC works with ESM
- ⚠️ Website integration plugins - ensure all 50+ integrations work after migration

**Mitigation**:
- Thorough testing after each phase
- Feature branch isolation prevents production impact
- Existing test suite catches regressions
- Manual QA for website integrations

## References

- [Nx ESM Support Documentation](https://nx.dev/recipes/tips-n-tricks/esm-support)
- [Electron ESM Guide](https://www.electronjs.org/docs/latest/tutorial/esm)
- [NestJS with ESM](https://docs.nestjs.com/faq/esm)
- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution)
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
