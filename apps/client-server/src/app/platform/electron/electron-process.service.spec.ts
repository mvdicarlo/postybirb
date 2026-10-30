import { Logger } from '@postybirb/logger';
import { app, utilityProcess } from 'electron';
import { EventEmitter, once } from 'events';
import { PassThrough } from 'stream';
import { ElectronProcessService } from './electron-process.service';

jest.mock('electron', () => ({
  app: { whenReady: jest.fn() },
  utilityProcess: { fork: jest.fn() },
}));

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

function createChild() {
  return Object.assign(new EventEmitter(), {
    pid: 1234,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    postMessage: jest.fn(),
    kill: jest.fn(() => true),
  });
}

describe(ElectronProcessService.name, () => {
  let child: ReturnType<typeof createChild>;
  const logger = Logger();

  beforeEach(() => {
    jest.clearAllMocks();
    child = createChild();
    jest.mocked(app.whenReady).mockResolvedValue(undefined);
    jest.mocked(utilityProcess.fork).mockReturnValue(child);
  });

  afterEach(() => {
    child.stdout.destroy();
    child.stderr.destroy();
  });

  async function spawn() {
    const result = new ElectronProcessService().fork('worker.js', {
      serviceName: 'Sharp diagnostic test',
    });
    await Promise.resolve();
    child.emit('spawn');
    return result;
  }

  it('captures stdout and stderr in local application logs', async () => {
    const worker = await spawn();
    child.stdout.write('Worker starting\n');
    child.stderr.write('Native DLL initialization failed\n');

    expect(utilityProcess.fork).toHaveBeenCalledWith('worker.js', [], {
      serviceName: 'Sharp diagnostic test',
      stdio: 'pipe',
    });
    expect(logger.info).toHaveBeenCalledWith('Worker starting');
    expect(logger.warn).toHaveBeenCalledWith(
      'Native DLL initialization failed',
    );
    expect(logger.withMetadata).toHaveBeenCalledWith({
      workerPath: 'worker.js',
      serviceName: 'Sharp diagnostic test',
      telemetry: false,
      pid: 1234,
      stream: 'stderr',
    });
    expect(worker.pid).toBe(1234);
    worker.postMessage({ id: 1 });
    expect(child.postMessage).toHaveBeenCalledWith({ id: 1 });
    worker.kill();
    expect(child.kill).toHaveBeenCalled();
  });

  it('captures startup stderr even when the worker exits before spawning', async () => {
    const result = new ElectronProcessService().fork('missing-worker.js');
    await Promise.resolve();
    child.stderr.write('Cannot find module missing-worker.js\n');
    const rejected = expect(result).rejects.toThrow(
      'exited before it finished spawning (code 1)',
    );
    child.emit('exit', 1);

    await rejected;
    expect(logger.warn).toHaveBeenCalledWith(
      'Cannot find module missing-worker.js',
    );
  });

  it('preserves UTF-8 characters and complete lines across output chunks', async () => {
    await spawn();
    const output = 'DLL \u00e9chec: missing native binding';
    const bytes = Buffer.from(`${output}\n`);
    child.stderr.write(bytes.subarray(0, 5));
    expect(logger.warn).not.toHaveBeenCalled();

    child.stderr.write(bytes.subarray(5));

    expect(logger.warn).toHaveBeenCalledWith(output);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('logs the final output line even without a trailing newline', async () => {
    await spawn();
    child.stderr.write('Final native startup error');
    const ended = once(child.stderr, 'end');

    child.stderr.end();
    await ended;

    expect(logger.warn).toHaveBeenCalledWith('Final native startup error');
  });

  it('handles fatal runtime errors without logging the sensitive diagnostic report', async () => {
    await spawn();
    const report = JSON.stringify({
      environmentVariables: { TOKEN: 'private-value' },
    });

    expect(() =>
      child.emit('error', 'FatalError', 'native initialization', report),
    ).not.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      'Worker reported a fatal runtime error',
    );
    expect(logger.withMetadata).toHaveBeenCalledWith({
      workerPath: 'worker.js',
      serviceName: 'Sharp diagnostic test',
      telemetry: false,
      pid: 1234,
      type: 'FatalError',
      location: 'native initialization',
    });
    expect(
      JSON.stringify(jest.mocked(logger.withMetadata).mock.calls),
    ).not.toContain('private-value');
  });

  it('reports output stream errors explicitly', async () => {
    await spawn();
    const error = new Error('Worker stderr pipe failed');

    child.stderr.emit('error', error);

    expect(logger.withError).toHaveBeenCalledWith(error);
    expect(logger.error).toHaveBeenCalledWith('Failed to read worker stderr');
  });
});
