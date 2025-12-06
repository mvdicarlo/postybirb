# Contract: jest.config.ts

**Feature**: ESM Migration  
**Contract Type**: Configuration File Structure  
**Applies To**: jest.preset.js, apps/*/jest.config.ts, libs/*/jest.config.ts

## Purpose

Configures Jest test framework to execute tests written in ECMAScript Modules. Handles TypeScript transformation, module resolution, and path alias mapping for test files.

## Contract Specification

### Required Changes

```typescript
export default {
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', { /* swc options */ }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@postybirb/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
};
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transform` | object | ✅ Yes | Maps file patterns to transformers |
| `extensionsToTreatAsEsm` | string[] | ✅ Yes | File extensions to treat as ESM |
| `moduleNameMapper` | object | ✅ Yes | Maps path aliases to actual paths |
| `testEnvironment` | string | ⚠️ As needed | "node" or "jsdom" |
| `preset` | string | ⚠️ Sub-projects | Path to shared preset |

### jest.preset.js (Root Preset)

```javascript
// Export as ESM default
export default {
  coverageDirectory: './coverage',
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { decoratorMetadata: true },
          target: 'es2022',
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageReporters: ['html', 'lcov'],
};
```

### apps/postybirb/jest.config.ts

```typescript
import baseConfig from '../../jest.preset.js';

export default {
  ...baseConfig,
  displayName: 'postybirb',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  coverageDirectory: '../../coverage/apps/postybirb',
  moduleNameMapper: {
    '^@postybirb/types$': '<rootDir>/../../libs/types/src/index.ts',
    '^@postybirb/http$': '<rootDir>/../../libs/http/src/index.ts',
    '^@postybirb/database$': '<rootDir>/../../libs/database/src/index.ts',
    '^@postybirb/fs$': '<rootDir>/../../libs/fs/src/index.ts',
    '^@postybirb/logger$': '<rootDir>/../../libs/logger/src/index.ts',
    '^@postybirb/utils/electron$': '<rootDir>/../../libs/utils/electron/src/index.ts',
    '^@postybirb/utils/file-type$': '<rootDir>/../../libs/utils/file-type/src/index.ts',
    '^@postybirb/socket-events$': '<rootDir>/../../libs/socket-events/src/index.ts',
    '^@postybirb/form-builder$': '<rootDir>/../../libs/form-builder/src/index.ts',
    '^@postybirb/translations$': '<rootDir>/../../libs/translations/src/index.ts',
  },
};
```

### libs/database/jest.config.ts

```typescript
import baseConfig from '../../jest.preset.js';

export default {
  ...baseConfig,
  displayName: 'database',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  coverageDirectory: '../../coverage/libs/database',
  moduleNameMapper: {
    '^@postybirb/types$': '<rootDir>/../../libs/types/src/index.ts',
    '^@postybirb/logger$': '<rootDir>/../../libs/logger/src/index.ts',
  },
};
```

## Validation Criteria

### Build-Time Validation
- ✅ Jest config exports successfully: `node -e "import('./jest.config.ts')"`
- ✅ No syntax errors in jest.config.ts files

### Test Execution Validation
- ✅ Tests run successfully: `nx affected:test`
- ✅ Path aliases resolve in tests
- ✅ No module resolution errors
- ✅ Coverage reports generate correctly

### Module Resolution Validation
- ✅ Test files can import from `@postybirb/*` aliases
- ✅ Test files can import from relative paths: `'./util'`
- ✅ Test files can import from node_modules: `'@nestjs/common'`

## Breaking Changes

### Preset Export Format

**Before (CommonJS)**:
```javascript
// jest.preset.js
module.exports = {
  coverageDirectory: './coverage',
};
```

**After (ESM)**:
```javascript
// jest.preset.js
export default {
  coverageDirectory: './coverage',
};
```

### Config File Import

**Before**: Jest auto-loaded CommonJS configs
```typescript
// No explicit import needed
```

**After**: Jest loads ESM configs
```typescript
// Must use ESM export
export default { /* config */ };
```

## Migration Notes

### Why @swc/jest instead of ts-jest?

- **@swc/jest**: Faster TypeScript transformation (Rust-based)
  - ✅ 10-20x faster than ts-jest
  - ✅ Better ESM support
  - ✅ Recommended by Nx team

- **ts-jest**: Slower but more mature
  - ❌ Slower transformation
  - ⚠️ ESM support requires additional configuration

**Decision**: Use @swc/jest for speed and better ESM compatibility.

### Path Alias Mapping

Each jest.config.ts must manually map **all** @postybirb/* aliases used by that project. This is because Jest doesn't read tsconfig paths at runtime.

**Pattern**:
```typescript
moduleNameMapper: {
  '^@postybirb/<library>$': '<rootDir>/../../libs/<library>/src/index.ts',
}
```

### SWC Configuration for Decorators

NestJS projects require decorator support in SWC:
```javascript
jsc: {
  parser: { syntax: 'typescript', decorators: true },
  transform: { decoratorMetadata: true },
}
```

### extensionsToTreatAsEsm

This tells Jest to treat `.ts` files as ESM, not CommonJS. Without this, Jest would try to use `require()` instead of `import`.

## Troubleshooting

### Error: "Cannot use import statement outside a module"
**Cause**: `extensionsToTreatAsEsm` not configured  
**Fix**: Add `extensionsToTreatAsEsm: ['.ts']` to jest.config.ts

### Error: "Cannot find module '@postybirb/types'"
**Cause**: Path alias not mapped in `moduleNameMapper`  
**Fix**: Add mapping for the missing alias

### Error: "SyntaxError: Unexpected token 'export'"
**Cause**: jest.preset.js not using ESM export  
**Fix**: Change `module.exports =` to `export default`

## Rollback Procedure

If ESM tests cause issues:
1. Change jest.preset.js back to `module.exports =` format
2. Remove `extensionsToTreatAsEsm` from all configs
3. Change transform back to ts-jest if needed
4. Run tests: `nx affected:test`

## Related Contracts

- `package.json.contract.md` - Must set `"type": "module"`
- `tsconfig.contract.md` - Must set `"module": "esnext"`
- `nx.config.contract.md` - Nx @nx/jest executor must work

## References

- [Jest ESM Support](https://jestjs.io/docs/ecmascript-modules)
- [SWC Jest Documentation](https://swc.rs/docs/usage/jest)
- [Nx Jest Executor](https://nx.dev/nx-api/jest/executors/jest)
