# Contract: project.json (Nx Configuration)

**Feature**: ESM Migration  
**Contract Type**: Configuration File Structure  
**Applies To**: apps/*/project.json, libs/*/project.json

## Purpose

Defines Nx build/test/lint targets for each project. While most Nx executors automatically detect ESM from tsconfig, this contract documents expected executor behavior and any required option changes.

## Contract Specification

### No Structural Changes Required

**Key Insight**: Nx executors (e.g., `@nx/js:tsc`, `nx-electron:build`, `@nx/jest:jest`) read the `module` setting from `tsconfig.json` and automatically output the correct format. No explicit `format` option needed.

### Expected Structure (Unchanged)

```json
{
  "name": "postybirb",
  "sourceRoot": "apps/postybirb/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "nx-electron:build",
      "options": {
        "outputPath": "dist/apps/postybirb",
        "main": "apps/postybirb/src/main.ts",
        "tsConfig": "apps/postybirb/tsconfig.app.json",
        "assets": ["apps/postybirb/src/assets"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/postybirb/jest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["apps/postybirb/**/*.ts"]
      }
    }
  }
}
```

## Validation Criteria

### Build Target Validation
- ✅ Build succeeds: `nx build <project>`
- ✅ Output files use ESM syntax (check dist/ files)
- ✅ No "require is not defined" errors at runtime

### Test Target Validation
- ✅ Tests run: `nx test <project>`
- ✅ Jest config loads correctly
- ✅ No module resolution errors

### Lint Target Validation
- ✅ Linting runs: `nx lint <project>`
- ✅ TypeScript type checking passes

### Cache Validation
- ✅ First build after migration is slower (cache miss)
- ✅ Second build is fast (cache hit)
- ✅ Affected command works: `nx affected:build`

## Executor Behavior

### @nx/js:tsc (TypeScript Library Compiler)

**Reads**: `tsconfig.json` → `compilerOptions.module`  
**Output**: Matches tsconfig module setting (ESM if "esnext")  
**No changes needed**: Executor automatically detects ESM

**Example Output (ESM)**:
```javascript
// dist/libs/database/index.js
export class DatabaseService {}
export { schema } from './schema.js';
```

### nx-electron:build (Electron App Builder)

**Reads**: `tsconfig.app.json` → `compilerOptions.module`  
**Output**: Bundles main process and renderer with correct module format  
**No changes needed**: Executor detects ESM from tsconfig

**Expected Output**:
- Main process: ESM bundle in `dist/apps/postybirb/main.js`
- Renderer: ESM bundle in `dist/apps/postybirb/renderer/index.js`

### @nx/jest:jest (Test Runner)

**Reads**: `jest.config.ts` (which must be ESM-compatible)  
**Output**: Test results  
**No changes needed**: Jest config handles ESM transformation

### @nx/vite:build (Vite Builder for UI)

**Reads**: `vite.config.ts`  
**Output**: Bundled ESM for browser  
**No changes needed**: Vite is ESM-native

## Breaking Changes

### None for project.json Structure

The ESM migration **does not require changes to project.json**. The executors detect the module format from tsconfig.json.

### Cache Invalidation (Expected)

When tsconfig changes from `"module": "commonjs"` to `"module": "esnext"`, Nx automatically invalidates the cache because the configuration hash changes. This is expected and correct behavior.

## Migration Notes

### Phase 1: Libraries
- Build 10 library projects with ESM tsconfig
- Nx executors automatically output ESM
- Cache invalidates once per library

### Phase 2: Applications
- Build 3 app projects with ESM tsconfig
- Electron main process loads as ESM (requires package.json "type": "module")
- UI (Vite) already ESM-compatible

### Affected Command

The `nx affected:build` command respects the module format from tsconfig. No special flags needed.

## Validation Commands

```bash
# Build all affected projects
nx affected:build

# Test all affected projects
nx affected:test

# Lint all affected projects
nx affected:lint

# Visualize dependency graph
nx graph

# Reset cache (if needed)
nx reset
```

## Troubleshooting

### Error: "require is not defined"
**Cause**: Output is ESM, but runtime expects CommonJS  
**Fix**: Add `"type": "module"` to root package.json

### Error: "Cannot find module"
**Cause**: Path aliases not resolved correctly  
**Fix**: Verify tsconfig.base.json paths are correct

### Slow Builds After Migration
**Cause**: Cache invalidation (expected)  
**Solution**: Wait for first build, subsequent builds will be fast

### Executor Fails to Build
**Cause**: Executor doesn't support ESM (rare)  
**Solution**: Check executor documentation, may need upgrade

## Rollback Procedure

If executors fail with ESM:
1. Revert tsconfig `module` back to "commonjs"
2. Run `nx reset` to clear cache
3. Rebuild: `nx affected:build`
4. Investigate executor compatibility

## Related Contracts

- `package.json.contract.md` - Must set `"type": "module"` for runtime
- `tsconfig.contract.md` - Executors read `module` setting from here
- `jest.config.contract.md` - @nx/jest executor loads this config

## Nx Executor Documentation

- [@nx/js:tsc](https://nx.dev/nx-api/js/executors/tsc)
- [@nx/jest:jest](https://nx.dev/nx-api/jest/executors/jest)
- [@nx/eslint:lint](https://nx.dev/nx-api/eslint/executors/lint)
- [nx-electron:build](https://github.com/bennymeg/nx-electron)

## References

- [Nx Build System](https://nx.dev/concepts/how-caching-works)
- [Nx Affected Commands](https://nx.dev/nx-api/nx/documents/affected)
- [Nx Dependency Graph](https://nx.dev/features/explore-graph)
