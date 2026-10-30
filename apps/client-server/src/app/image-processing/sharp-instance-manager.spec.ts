import { Logger } from '@postybirb/logger';
import type { PlatformWorkerProcess } from '@postybirb/platform';
import { NoopPlatformService } from '../platform/testing/noop-platform-providers';
import { SharpInstanceManager } from './sharp-instance-manager';

jest.mock('@postybirb/logger', () => {
  const logger = {
    withMetadata: jest.fn().mockReturnThis(),
    withError: jest.fn().mockReturnThis(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    ...jest.requireActual<typeof import('@postybirb/logger')>(
      '@postybirb/logger',
    ),
    Logger: jest.fn(() => logger),
  };
});

class TestWorker implements PlatformWorkerProcess {
  pid: number | undefined = 1234;

  private messageListener?: (message: unknown) => void;

  private exitListener?: (code: number) => void;

  constructor(private readonly respond: (worker: TestWorker) => void) {}

  postMessage(): void {
    queueMicrotask(() => this.respond(this));
  }

  onMessage(listener: (message: unknown) => void): void {
    this.messageListener = listener;
  }

  onExit(listener: (code: number) => void): void {
    this.exitListener = listener;
  }

  kill(): void {
    this.pid = undefined;
    this.exitListener?.(0);
  }

  reply(message: unknown): void {
    this.messageListener?.(message);
  }

  exit(code: number): void {
    this.pid = undefined;
    this.exitListener?.(code);
  }
}

describe(SharpInstanceManager.name, () => {
  let manager: SharpInstanceManager;
  const logger = Logger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await manager.onModuleDestroy();
    jest.restoreAllMocks();
  });

  function createManager(job: TestWorker) {
    const platform = new NoopPlatformService();
    const healthy = new TestWorker((worker) =>
      worker.reply({ id: 1, result: { modified: false } }),
    );
    jest
      .spyOn(platform.process, 'fork')
      .mockResolvedValueOnce(healthy)
      .mockResolvedValueOnce(job);
    manager = new SharpInstanceManager(platform);
  }

  it.each([0, 139])(
    'preserves the worker PID and avoids diagnosing exit %i as OOM',
    async (code) => {
      createManager(new TestWorker((worker) => worker.exit(code)));

      await expect(manager.getMetadata(Buffer.alloc(0))).rejects.toThrow(
        `Sharp worker process exited before returning a result (code ${code}) during metadata`,
      );

      expect(logger.withMetadata).toHaveBeenCalledWith({
        operation: 'metadata',
        exitCode: code,
        pid: 1234,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Sharp worker process exited before returning a result',
      );
      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/out-of-memory|libvips crash/),
      );
    },
  );

  it('preserves a worker error stack and records its native error code', async () => {
    const stack =
      'Error: DLL initialization failed\n    at initializeSharp (sharp-worker.js:30:5)';
    createManager(
      new TestWorker((worker) =>
        worker.reply({
          id: 1,
          error: {
            message: 'DLL initialization failed',
            stack,
            code: 'ERR_DLOPEN_FAILED',
          },
        }),
      ),
    );

    await expect(manager.getMetadata(Buffer.alloc(0))).rejects.toMatchObject({
      message: 'DLL initialization failed',
      stack,
    });
    expect(logger.withMetadata).toHaveBeenCalledWith({
      operation: 'metadata',
      pid: 1234,
      workerError: 'DLL initialization failed',
      workerErrorCode: 'ERR_DLOPEN_FAILED',
    });
  });

  it('includes system context in a failed startup healthcheck', async () => {
    const platform = new NoopPlatformService();
    jest.spyOn(platform.process, 'fork').mockResolvedValue(
      new TestWorker((worker) =>
        worker.reply({
          id: 1,
          error: { message: 'Missing native DLL', code: 'ERR_DLOPEN_FAILED' },
        }),
      ),
    );
    manager = new SharpInstanceManager(platform);

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(logger.withMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: process.platform,
        arch: process.arch,
        osRelease: expect.any(String),
        nodeVersion: process.version,
        workerPath: expect.stringContaining('sharp-worker.js'),
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Sharp health check FAILED. Image processing may be unavailable. ' +
        'See the worker error, stderr output, and child-process diagnostics for the cause.',
    );
  });
});
