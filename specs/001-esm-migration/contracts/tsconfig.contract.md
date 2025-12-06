# Contract: tsconfig.json

**Feature**: ESM Migration  
**Contract Type**: Configuration File Structure  
**Applies To**: tsconfig.base.json, apps/*/tsconfig.app.json, libs/*/tsconfig.lib.json

## Purpose

Configures TypeScript compiler to output ECMAScript Modules instead of CommonJS. Controls module resolution strategy and interoperability with CommonJS dependencies.

## Contract Specification

### Required Changes

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

### Field Definitions

| Field | Type | Required | Value | Description |
|-------|------|----------|-------|-------------|
| `module` | string | ✅ Yes | **"esnext"** | Output module format |
| `moduleResolution` | string | ✅ Yes | **"bundler"** | How to resolve imports |
| `esModuleInterop` | boolean | ✅ Yes | **true** | Allow default imports from CJS |
| `allowSyntheticDefaultImports` | boolean | ✅ Yes | **true** | Type checking for default imports |
| `emitDecoratorMetadata` | boolean | ⚠️ NestJS only | **true** | Required for dependency injection |
| `experimentalDecorators` | boolean | ⚠️ NestJS only | **true** | Enable decorator syntax |

### tsconfig.base.json Example

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "bundler",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "esnext",
    "lib": ["ES2022"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "paths": {
      "@postybirb/types": ["libs/types/src/index.ts"],
      "@postybirb/http": ["libs/http/src/index.ts"],
      "@postybirb/database": ["libs/database/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp"]
}
```

### apps/postybirb/tsconfig.app.json Example

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "module": "esnext",
    "types": ["node"]
  },
  "files": ["src/main.ts"],
  "include": ["src/**/*.ts"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

### libs/database/tsconfig.lib.json Example

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "esnext",
    "outDir": "../../dist/out-tsc",
    "declaration": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

## Validation Criteria

### Build-Time Validation
- ✅ TypeScript compilation succeeds: `nx affected:build`
- ✅ No type errors: `nx affected:lint`
- ✅ IDE shows no type errors

### Module Resolution Validation
- ✅ Path aliases resolve correctly: `@postybirb/types` → `libs/types/src/index.ts`
- ✅ Default imports work: `import Database from 'better-sqlite3'`
- ✅ Named imports work: `import { Injectable } from '@nestjs/common'`

### Decorator Validation (NestJS projects only)
- ✅ `@Injectable()` decorators work
- ✅ `@Module()` decorators work
- ✅ Dependency injection functions correctly

## Breaking Changes

### Module Output Format

**Before (CommonJS)**:
```javascript
// Compiled output
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyClass = void 0;
class MyClass {}
exports.MyClass = MyClass;
```

**After (ESM)**:
```javascript
// Compiled output
class MyClass {}
export { MyClass };
```

### Import Statements

**Before**: Could omit file extensions in source
```typescript
import { util } from './util'; // Worked with "node" resolution
```

**After**: Same extensionless imports work with "bundler" resolution
```typescript
import { util } from './util'; // Still works with "bundler"
```

## Migration Notes

### Why "bundler" instead of "node16"?

- **"bundler"**: Designed for build-tool workflows (Nx, webpack, Vite)
  - ✅ Handles path aliases (@postybirb/*)
  - ✅ No file extensions required in imports
  - ✅ Works with both Node.js and browser targets

- **"node16"/"nodenext"**: Strict Node.js ESM resolution
  - ❌ Requires .js extensions: `import './util.js'`
  - ❌ Breaks path aliases without extra configuration
  - ❌ More verbose source code

**Decision**: Use "bundler" because Nx executors bundle outputs, not pure Node.js execution.

### Path Aliases Unchanged

The `paths` field in tsconfig.base.json remains unchanged. TypeScript resolves these at compile time, and Nx executors handle the bundling.

### Decorator Metadata

NestJS relies on `emitDecoratorMetadata` to enable dependency injection. This **must** remain `true` for all NestJS projects (apps/postybirb, apps/client-server).

## Rollback Procedure

If ESM causes issues:
1. Change `"module": "esnext"` back to `"module": "commonjs"` in all tsconfig files
2. Change `"moduleResolution": "bundler"` back to `"moduleResolution": "node"`
3. Run `nx reset` to clear cache
4. Rebuild: `nx run-many --target=build --all`

## Related Contracts

- `package.json.contract.md` - Must set `"type": "module"`
- `jest.config.contract.md` - Must configure ESM test support
- `nx.config.contract.md` - Executors read tsconfig module setting

## References

- [TypeScript Module Compiler Options](https://www.typescriptlang.org/tsconfig#module)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution)
- [TypeScript Bundler Resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html#bundler)
