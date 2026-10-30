import { join } from 'path';
import type {
  SharpWorkerInput,
  SharpWorkerResult,
} from './sharp-instance-manager';

interface WorkerResponse {
  id: number;
  result?: SharpWorkerResult;
  error?: { message: string; stack?: string; code?: string | number };
}

type WorkerModule = ((
  input: SharpWorkerInput,
) => Promise<SharpWorkerResult>) & {
  dispatch(message: {
    id: number;
    input: SharpWorkerInput;
  }): Promise<WorkerResponse>;
};

const workerPath = join(__dirname, '..', '..', 'assets', 'sharp-worker.js');
const input: SharpWorkerInput = {
  operation: 'healthcheck',
  buffer: Buffer.alloc(0),
  mimeType: '',
};

describe('Sharp worker startup diagnostics', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.dontMock('@janhapke/sharp-electron');
    jest.resetModules();
  });

  it('returns a native module loading error through the existing response protocol', async () => {
    const error = Object.assign(
      new Error('The specified DLL could not be loaded'),
      {
        code: 'ERR_DLOPEN_FAILED',
      },
    );
    jest.doMock('@janhapke/sharp-electron', () => {
      throw error;
    });

    const worker = jest.requireActual<WorkerModule>(workerPath);
    const response = await worker.dispatch({ id: 7, input });

    expect(response).toEqual({
      id: 7,
      error: {
        message: error.message,
        stack: error.stack,
        code: 'ERR_DLOPEN_FAILED',
      },
    });
    await expect(worker(input)).rejects.toBe(error);
  });

  it('reports native initialization failures without caching a broken instance', async () => {
    const cache = jest.fn(() => {
      throw new Error('Sharp cache initialization failed');
    });
    const concurrency = jest.fn();
    jest.doMock('@janhapke/sharp-electron', () => ({ cache, concurrency }));
    const worker = jest.requireActual<WorkerModule>(workerPath);

    expect(await worker.dispatch({ id: 1, input })).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Sharp cache initialization failed',
        }),
      }),
    );
    expect(await worker.dispatch({ id: 2, input })).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Sharp cache initialization failed',
        }),
      }),
    );
    expect(cache).toHaveBeenCalledTimes(2);
    expect(concurrency).not.toHaveBeenCalled();
  });

  it('still performs the native JPEG healthcheck successfully', async () => {
    const worker = jest.requireActual<WorkerModule>(workerPath);

    expect(await worker.dispatch({ id: 1, input })).toEqual({
      id: 1,
      result: expect.objectContaining({
        width: 1,
        height: 1,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        modified: false,
        diagnostics: expect.objectContaining({ platform: process.platform }),
      }),
    });
  });
});
