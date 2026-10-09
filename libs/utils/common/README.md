# utils-common

Platform-agnostic utility functions shared across the workspace. This library must NOT depend on Electron, Node-only APIs that aren't broadly available, or any runtime-specific module.

Use this for pure helpers (env detection, OS detection, string formatters) that are safe to import from any tier (libs, server, UI build-time code).
