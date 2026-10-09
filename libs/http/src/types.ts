/**
 * Electron-free entry point for `@postybirb/http`.
 *
 * Import from `@postybirb/http/types` instead of `@postybirb/http` from any
 * code that must not load electron at module-evaluation time (tests,
 * non-electron runtimes, scripts). Exposes pure type declarations and the
 * `FormFile` value class, neither of which touches electron.
 */

export * from './lib/form-file';
export * from './lib/types';
