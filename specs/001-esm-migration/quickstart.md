# Quickstart: ESM Migration Validation

**Feature**: ESM Migration  
**Branch**: 001-esm-migration  
**Date**: 2025-12-05

## Purpose

This guide provides step-by-step validation procedures to verify the ESM migration was successful. Use these commands to confirm that the PostyBirb monorepo correctly builds, tests, and runs in ESM mode.

---

## Prerequisites

- ✅ All Phase 1 changes committed (libraries migrated)
- ✅ All Phase 2 changes committed (applications migrated)
- ✅ Git branch: `001-esm-migration`

---

## Validation Steps

### 1. Clear Nx Cache

**Why**: Ensure builds use updated configurations, not cached CommonJS outputs.

```bash
nx reset
```

**Expected Output**:
```
Successfully reset the Nx workspace.
```

---

### 2. Verify TypeScript Configuration

**Why**: Confirm all tsconfig files use ESM settings.

```bash
# Check root config
grep -A 5 "compilerOptions" tsconfig.base.json | grep "module"

# Check app configs
grep "module" apps/*/tsconfig.app.json

# Check lib configs
grep "module" libs/*/tsconfig.lib.json
```

**Expected Output**:
```
"module": "esnext"
"moduleResolution": "bundler"
```

**❌ Fail if**: Any config shows `"module": "commonjs"`

---

### 3. Verify package.json Type

**Why**: Confirm Node.js will treat .js files as ESM at runtime.

```bash
grep '"type"' package.json
```

**Expected Output**:
```
"type": "module"
```

**❌ Fail if**: Output is empty or shows `"type": "commonjs"`

---

### 4. Build All Projects

**Why**: Verify all Nx executors produce ESM outputs without errors.

```bash
nx run-many --target=build --all
```

**Expected Output**:
```
✓ Successfully ran target build for 13 projects
```

**⏱️ Expected Time**: 2-5 minutes (first build after cache clear)

**❌ Fail if**:
- Any build errors appear
- Output shows "require is not defined"
- Import errors logged

---

### 5. Verify ESM Output Format

**Why**: Confirm compiled JavaScript uses ESM syntax, not CommonJS.

```bash
# Check library output
head -n 20 dist/libs/database/index.js

# Check app output
head -n 20 dist/apps/postybirb/main.js
```

**Expected Patterns**:
```javascript
// ESM exports
export class DatabaseService {}
export { schema };

// ESM imports
import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
```

**❌ Fail if**:
```javascript
// CommonJS patterns (should NOT appear)
module.exports = ...;
Object.defineProperty(exports, ...);
const x = require('...');
```

---

### 6. Run All Tests

**Why**: Verify Jest executes tests with ESM configuration.

```bash
nx run-many --target=test --all --skip-nx-cache
```

**Expected Output**:
```
✓ Successfully ran target test for 13 projects
Test Suites: X passed, X total
Tests:       Y passed, Y total
```

**⏱️ Expected Time**: 3-10 minutes

**❌ Fail if**:
- Test failures (not related to migration logic, but module loading)
- "Cannot use import statement outside a module" error
- "Cannot find module '@postybirb/...'" errors

---

### 7. Lint All Projects

**Why**: Verify TypeScript type checking passes with ESM.

```bash
nx run-many --target=lint --all
```

**Expected Output**:
```
✓ Successfully ran target lint for 13 projects
```

**❌ Fail if**:
- Type errors related to module resolution
- Errors about missing default exports
- Decorator-related errors (NestJS projects)

---

### 8. Test Electron Application Startup

**Why**: Verify the Electron main process loads ESM without runtime errors.

```bash
# Start dev server
nx serve postybirb
```

**Expected Behavior**:
1. Electron window opens
2. No console errors about "require is not defined"
3. No import failures in developer tools
4. Backend API responds (check health endpoint)
5. Frontend UI renders correctly

**⏱️ Expected Time**: 30-60 seconds to start

**❌ Fail if**:
- Window doesn't open
- Console shows module loading errors
- Backend crashes on startup
- UI shows blank screen or import errors

---

### 9. Verify Nx Dependency Graph

**Why**: Confirm Nx correctly parses ESM imports for affected analysis.

```bash
nx graph
```

**Expected Behavior**:
- Browser opens showing project graph
- All 13 projects appear (3 apps + 10 libs)
- Dependencies correctly linked (e.g., postybirb → database → types)

**❌ Fail if**:
- Graph missing projects
- Dependencies incorrectly linked
- Graph generation error

---

### 10. Test Affected Command

**Why**: Verify Nx affected analysis works with ESM imports.

```bash
# Make a trivial change to a library
echo "// test" >> libs/types/src/index.ts

# Check affected projects
nx affected:build --dry-run

# Revert change
git checkout -- libs/types/src/index.ts
```

**Expected Output**:
```
Affected projects:
- types
- database (depends on types)
- postybirb (depends on database)
- ... (other dependents)
```

**❌ Fail if**:
- "No projects affected" (should affect dependents)
- Affected command crashes
- Dependency analysis incorrect

---

### 11. Run End-to-End Smoke Test

**Why**: Verify core functionality works with ESM.

**Manual Test Steps**:
1. Start application: `nx serve postybirb`
2. Open Electron window
3. Create a new submission
4. Upload a test image
5. Select a website integration
6. Post submission (or dry-run)
7. Verify database operations work
8. Check logs for errors

**✅ Pass if**:
- All operations complete without module loading errors
- Database reads/writes work
- File uploads work
- Website integrations load correctly

**❌ Fail if**:
- Module loading errors in console
- Database operations fail
- File operations fail
- Website integrations crash

---

## Success Criteria Summary

| Check | Command | Expected Result |
|-------|---------|-----------------|
| 1. Cache Clear | `nx reset` | "Successfully reset" |
| 2. TS Config | `grep "module" tsconfig.*.json` | All show "esnext" |
| 3. Package Type | `grep '"type"' package.json` | Shows "module" |
| 4. Build All | `nx run-many --target=build --all` | 13 projects pass |
| 5. ESM Output | `head dist/*/index.js` | Shows `export`, not `require` |
| 6. Test All | `nx run-many --target=test --all` | All tests pass |
| 7. Lint All | `nx run-many --target=lint --all` | No type errors |
| 8. Electron Start | `nx serve postybirb` | App opens, no errors |
| 9. Nx Graph | `nx graph` | Shows all 13 projects |
| 10. Affected | `nx affected:build --dry-run` | Detects dependents |
| 11. Smoke Test | Manual testing | Core features work |

---

## Troubleshooting

### Issue: "require is not defined" Error

**Cause**: Runtime is ESM, but code contains `require()` call  
**Fix**: Find remaining CommonJS code, convert to ESM `import`

```bash
# Search for require() calls
grep -r "require(" apps/ libs/ --include="*.ts" --include="*.js"
```

### Issue: "Cannot find module '@postybirb/...'"

**Cause**: Path alias not resolved in Jest  
**Fix**: Add missing alias to `jest.config.ts` `moduleNameMapper`

### Issue: Build Fails with "Unexpected token 'export'"

**Cause**: Config file (jest.preset.js) still using CommonJS  
**Fix**: Convert to `export default {}`

### Issue: Tests Pass Locally but Fail in CI

**Cause**: CI cache contains old CommonJS outputs  
**Fix**: Add `nx reset` to CI pipeline before build/test

---

## Rollback Procedure

If validation fails and fix-forward isn't feasible:

```bash
# 1. Checkout main branch
git checkout main

# 2. Delete feature branch (if needed)
git branch -D 001-esm-migration

# 3. Clear cache
nx reset

# 4. Rebuild with CommonJS
nx run-many --target=build --all
```

---

## Next Steps

After all validation passes:

1. ✅ **Merge to main**: Open PR for `001-esm-migration` → `main`
2. ✅ **Update CI/CD**: Ensure pipelines include `nx reset` if needed
3. ✅ **Document**: Update README.md with ESM requirements (Node.js 24.6+)
4. ✅ **Monitor**: Watch for runtime errors in production builds
5. ✅ **Celebrate**: ESM migration complete! 🎉

---

## Reference

- **Feature Spec**: `specs/001-esm-migration/spec.md`
- **Implementation Plan**: `specs/001-esm-migration/plan.md`
- **Research**: `specs/001-esm-migration/research.md`
- **Contracts**: `specs/001-esm-migration/contracts/*.md`
