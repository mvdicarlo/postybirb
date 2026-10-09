import {
  accessSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { dirname } from 'path';

export type StartupOptions = {
  startAppOnSystemStartup: boolean;
  spellchecker: boolean;
  appDataPath: string;
  port: string;
};

export type StartupOptionsConfig = {
  /** Absolute path to the JSON file used for persisting startup options. */
  storagePath: string;
  /** Default value for `appDataPath` when no overrides exist on disk. */
  defaultAppDataPath: string;
};

export type StartupOptionsListener = (opts: StartupOptions) => void;

/**
 * Persists and exposes the application's startup options. Holds no host
 * platform dependencies — the storage path and `appDataPath` default must
 * be supplied by the caller via {@link configure} during application
 * startup (typically from apps/postybirb's electron main).
 *
 * Exposed as a singleton via {@link StartupOptionsManager}.
 */
export class StartupOptionsStore {
  private storagePath: string | null = null;

  private defaults: StartupOptions | null = null;

  private current: StartupOptions | null = null;

  private readonly listeners: StartupOptionsListener[] = [];

  /**
   * Configure where startup options are persisted and what defaults to use
   * when the file does not yet exist. Must be invoked once during startup
   * before any {@link get} / {@link set} call.
   */
  public configure(config: StartupOptionsConfig): void {
    this.storagePath = config.storagePath;
    this.defaults = {
      startAppOnSystemStartup: false,
      spellchecker: true,
      port: '9487',
      appDataPath: config.defaultAppDataPath,
    };
    // Drop memoized state so a reconfigure (mostly tests) takes effect.
    this.current = null;
  }

  public get(): StartupOptions {
    if (!this.current) {
      this.current = this.load();
      const path = this.requirePath();
      if (!existsSync(path)) {
        const dir = dirname(path);
        try {
          accessSync(dir);
        } catch {
          mkdirSync(dir, { recursive: true });
        }
        this.persist(this.current);
      }
    }
    return { ...this.current };
  }

  public set(opts: Partial<StartupOptions>): void {
    if (!this.current) {
      this.current = this.load();
    }
    this.current = { ...this.current, ...opts };
    this.persist(this.current);
    const snapshot = this.current;
    this.listeners.forEach((listener) => listener(snapshot));
  }

  public onUpdate(listener: StartupOptionsListener): void {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }

  private requirePath(): string {
    if (!this.storagePath || !this.defaults) {
      throw new Error(
        'startup options are not configured; call StartupOptionsManager.configure() during startup',
      );
    }
    return this.storagePath;
  }

  private requireDefaults(): StartupOptions {
    if (!this.defaults) {
      throw new Error(
        'startup options are not configured; call StartupOptionsManager.configure() during startup',
      );
    }
    return this.defaults;
  }

  private load(): StartupOptions {
    const path = this.requirePath();
    const fallback = this.requireDefaults();
    try {
      if (!existsSync(path)) {
        return { ...fallback };
      }
      const raw = JSON.parse(readFileSync(path, 'utf-8'));
      if (raw) {
        return { ...fallback, ...raw };
      }
      return { ...fallback };
    } catch {
      return { ...fallback };
    }
  }

  private persist(opts: StartupOptions): void {
    const path = this.requirePath();
    try {
      writeFileSync(path, JSON.stringify(opts));
      // eslint-disable-next-line no-console
      console.log('Saved startup options', path);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Attempting to save startup options failed:', error);
    }
  }
}

/** Process-wide singleton. */
export const StartupOptionsManager = new StartupOptionsStore();
