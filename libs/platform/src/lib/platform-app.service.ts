/**
 * Logical names for paths the application needs to resolve at runtime.
 * Implementations map these to OS-appropriate locations (Electron app.getPath,
 * XDG dirs in a headless implementation, etc.).
 */
export type PlatformPathName =
  | 'userData'
  | 'documents'
  | 'home'
  | 'temp'
  | 'logs';

/**
 * Application-level capabilities (version, paths, lifecycle).
 *
 * Use this abstract class as both the type and the NestJS DI token:
 *
 * ```ts
 * constructor(private readonly app: PlatformAppService) {}
 * ```
 */
export abstract class PlatformAppService {
  /** Returns the application version, e.g. "4.0.2". */
  abstract getVersion(): string;

  /** Resolves the absolute path for a logical path name. */
  abstract getPath(name: PlatformPathName): string;

  /**
   * Requests the application terminate. Implementations may exit the process
   * synchronously or asynchronously depending on the runtime.
   */
  abstract quit(): void;
}
