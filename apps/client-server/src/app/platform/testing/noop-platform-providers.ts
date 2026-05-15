/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-classes-per-file */
import { Provider } from '@nestjs/common';
import {
  PlatformAppService,
  PlatformBrowserService,
  PlatformNetworkService,
  PlatformNotificationService,
  PlatformService,
  PlatformSessionService,
} from '@postybirb/platform';

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

class NoopPlatformNetworkService implements PlatformNetworkService {
  isOnline(): boolean {
    return true;
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input as RequestInfo, init);
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

  readonly network = new NoopPlatformNetworkService();
}

/**
 * Default no-op platform provider suitable for unit tests that do not
 * exercise platform-specific behavior.
 */
export const noopPlatformProvider: Provider = {
  provide: PlatformService,
  useClass: NoopPlatformService,
};
