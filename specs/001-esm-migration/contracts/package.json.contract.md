# Contract: package.json

**Feature**: ESM Migration  
**Contract Type**: Configuration File Structure  
**Applies To**: Root package.json

## Purpose

Defines the module system for the entire PostyBirb monorepo. Adding `"type": "module"` signals to Node.js that all `.js` files should be treated as ECMAScript Modules.

## Contract Specification

### Required Changes

```json
{
  "type": "module"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ Yes | Module system: **"module"** for ESM, "commonjs" for CJS |

### Complete Example

```json
{
  "name": "postybirb",
  "version": "4.0.0",
  "type": "module",
  "private": true,
  "workspaces": [
    "apps/*",
    "libs/*"
  ],
  "scripts": {
    "dev": "nx run-many --target=serve --projects=postybirb,postybirb-ui",
    "build": "nx run-many --target=build --all",
    "test": "nx affected:test"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.16",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@nx/jest": "^19.8.9",
    "@nx/js": "^19.8.9",
    "typescript": "^5.8.3"
  }
}
```

## Validation Criteria

### Build-Time Validation
- ✅ No TypeScript compilation errors
- ✅ Nx build succeeds: `nx affected:build`

### Runtime Validation
- ✅ Electron main process starts without import errors
- ✅ NestJS backend initializes successfully
- ✅ React UI loads without module errors

### Behavioral Validation
- `.js` files are treated as ESM (can use `import`/`export`)
- `.cjs` files are treated as CommonJS (can use `require()`)
- Dynamic imports work: `await import('./module.js')`

## Breaking Changes

### Before (CommonJS)
```javascript
// .js files could use require()
const express = require('express');
module.exports = app;
```

### After (ESM)
```javascript
// .js files must use import/export
import express from 'express';
export default app;
```

## Migration Notes

- **Sub-project package.json files** (apps/*/package.json, libs/*/package.json) should **omit** the `type` field - they inherit from root
- If a specific sub-project needs CommonJS, it can override with `"type": "commonjs"`
- This change affects runtime behavior, not just build output

## Rollback Procedure

If ESM causes issues:
1. Remove `"type": "module"` from root package.json
2. Revert all tsconfig `module` changes back to "commonjs"
3. Run `nx reset` to clear cache
4. Rebuild: `nx run-many --target=build --all`

## Related Contracts

- `tsconfig.contract.md` - Must set `"module": "esnext"`
- `jest.config.contract.md` - Must configure ESM test support
- `nx.config.contract.md` - Executors must handle ESM output

## References

- [Node.js Package.json type field](https://nodejs.org/api/packages.html#type)
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
