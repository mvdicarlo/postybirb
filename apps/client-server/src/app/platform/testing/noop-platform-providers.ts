/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-classes-per-file */
import { Provider } from '@nestjs/common';
import {
  PlatformAppService,
  PlatformBrowserService,
  PlatformForkOptions,
  PlatformHttpService,
  PlatformNotificationService,
  PlatformProxyService,
  type PlatformProxySession,
  PlatformProcessService,
  PlatformService,
  PlatformSessionService,
  PlatformWorkerProcess,
} from '@postybirb/platform';
import type { ProxyConfiguration } from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/common';

class NoopPlatformAppService implements PlatformAppService {
  getVersion(): string {
    return '0.0.0-test';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPath(_name: Parameters<PlatformAppService['getPath']>[0]): string {
    return '';
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  quit(): void {}
}

class NoopPlatformSessionService implements PlatformSessionService {
  async getCookies(): Promise<never[]> {
    return [];
  }

  async setCookie(): Promise<void> {}

  async removeCookie(): Promise<void> {}

  async flushCookies(): Promise<void> {}

  async clearStorageData(): Promise<void> {}
}

class NoopPlatformBrowserService implements PlatformBrowserService {
  async getLocalStorage<T = Record<string, string>>(): Promise<T> {
    return {} as T;
  }

  async runScriptOnPage<T>(): Promise<T> {
    return undefined as unknown as T;
  }

  async ping(): Promise<void> {}
}

class NoopPlatformNotificationService implements PlatformNotificationService {
  isSupported(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  show(): void {}
}

class NoopPlatformHttpService implements PlatformHttpService {
  getUserAgent(): string {
    return 'PostyBirb/0.0.0-test';
  }

  async getWebsiteCookies(): Promise<never[]> {
    return [];
  }

  async getParsedProxiesFor(): Promise<never[]> {
    return [];
  }

  async get<T>(): Promise<never> {
    throw new Error('NoopPlatformHttpService.get is not implemented');
  }

  async post<T>(): Promise<never> {
    throw new Error('NoopPlatformHttpService.post is not implemented');
  }

  async patch<T>(): Promise<never> {
    throw new Error('NoopPlatformHttpService.patch is not implemented');
  }

  async put<T>(): Promise<never> {
    throw new Error('NoopPlatformHttpService.put is not implemented');
  }
}

class NoopPlatformProxyService extends PlatformProxyService {
  async applyProxy(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _partitionIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _configuration?: ProxyConfiguration,
  ): Promise<void> {}

  async onSessionCreated(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _createdSession: PlatformProxySession,
  ): Promise<void> {}
}

/**
 * Shape a forked worker module is expected to expose for in-process
 * execution: an async `dispatch(message) => response` envelope handler.
 */
interface DispatchableWorkerModule {
  dispatch(message: unknown): Promise<unknown>;
}

/**
 * In-process {@link PlatformWorkerProcess} used in tests. Instead of spawning
 * a real OS process, it `require`s the worker module and relays each message
 * through the module's exported `dispatch` handler. This exercises the real
 * worker logic (e.g. sharp) without the cost — or crash isolation — of a
 * separate process.
 */
class InProcessWorkerProcess implements PlatformWorkerProcess {
  readonly pid = undefined;

  private readonly worker: DispatchableWorkerModule;

  private readonly messageListeners: Array<(message: unknown) => void> = [];

  constructor(modulePath: string) {
    // SECURITY: this implementation dynamically `require`s an arbitrary module
    // path and is intended ONLY for the test/jest environment. Refuse to load
    // anything outside tests so it can never become a remote/arbitrary code
    // execution vector in a production build.
    if (!IsTestEnvironment()) {
      throw new Error(
        'InProcessWorkerProcess is only available in the test environment',
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-dynamic-require, global-require
    this.worker = require(modulePath) as DispatchableWorkerModule;
  }

  postMessage(message: unknown): void {
    // Mirror the async nature of a real process so listeners are invoked on a
    // later tick, matching production timing semantics.
    Promise.resolve(this.worker.dispatch(message)).then((response) => {
      this.messageListeners.forEach((listener) => listener(response));
    });
  }

  onMessage(listener: (message: unknown) => void): void {
    this.messageListeners.push(listener);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onExit(): void {
    // An in-process worker never exits on its own.
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  kill(): void {
    // Nothing to terminate for an in-process worker.
  }
}

class NoopPlatformProcessService extends PlatformProcessService {
  // In-process execution does NOT isolate native crashes; this is acceptable
  // for tests but signals that crash-isolation guarantees do not hold here.
  readonly isolatesCrashes = false;

  async fork(
    modulePath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: PlatformForkOptions,
  ): Promise<PlatformWorkerProcess> {
    return new InProcessWorkerProcess(modulePath);
  }
}

/**
 * No-op {@link PlatformService} facade for unit tests that do not exercise
 * platform-specific behavior. Each sub-service is an independent no-op
 * implementation so individual tests can spy on or override them as needed.
 */
export class NoopPlatformService extends PlatformService {
  readonly app = new NoopPlatformAppService();

  readonly session = new NoopPlatformSessionService();

  readonly browser = new NoopPlatformBrowserService();

  readonly notification = new NoopPlatformNotificationService();

  readonly http = new NoopPlatformHttpService();

  readonly proxy = new NoopPlatformProxyService();

  readonly process = new NoopPlatformProcessService();
}

/**
 * Default no-op platform provider suitable for unit tests that do not
 * exercise platform-specific behavior.
 */
export const noopPlatformProvider: Provider = {
  provide: PlatformService,
  useClass: NoopPlatformService,
};
