import { Account } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import { setTimeout as delay } from 'timers/promises';
import Bluesky from './bluesky.website';

jest.mock('timers/promises', () => ({ setTimeout: jest.fn() }));

describe('Bluesky video processing', () => {
  let website: Bluesky;
  let fetchMock: jest.SpyInstance;
  let poll: () => Promise<unknown>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(delay).mockImplementation((milliseconds, value, options) =>
      new Promise((resolve, reject) => {
        const signal = options?.signal;
        if (!signal) {
          throw new Error('Expected polling delay to receive an abort signal');
        }
        const onAbort = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        }, milliseconds);
        signal.addEventListener('abort', onAbort, { once: true });
      }));
    website = new Bluesky(new Account({ id: 'bluesky-account', website: 'bluesky' }), {} as PlatformService);
    jest.spyOn(website['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(website['logger'], 'error').mockImplementation(() => undefined);
    fetchMock = jest.spyOn(globalThis, 'fetch');
    poll = () => (website as unknown as {
      waitForVideoProcessing(jobId: string): Promise<unknown>;
    }).waitForVideoProcessing('video-job');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function respond(jobStatus: Record<string, unknown>) {
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({ jobStatus }) });
  }

  it('returns the processed blob and clears the timeout', async () => {
    const blob = { ref: 'video-blob' };
    respond({ state: 'JOB_STATE_COMPLETED', blob });
    const result = poll();
    await jest.advanceTimersByTimeAsync(4000);
    await expect(result).resolves.toEqual(blob);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    [{ state: 'JOB_STATE_FAILED', message: 'Processing rejected' }, 'Video processing failed: Processing rejected'],
    [{ state: 'JOB_STATE_COMPLETED' }, 'No blob ref after video processing'],
  ])('preserves terminal errors and clears the timeout (%j)', async (jobStatus, message) => {
    respond(jobStatus as Record<string, unknown>);
    const result = expect(poll()).rejects.toThrow(message as string);
    await jest.advanceTimersByTimeAsync(4000);
    await result;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops a perpetually processing job after fifteen minutes', async () => {
    respond({ state: 'JOB_STATE_PROCESSING' });
    const result = expect(poll()).rejects.toThrow('Bluesky video processing timed out after 15 minutes');
    await jest.advanceTimersByTimeAsync(15 * 60 * 1000);
    await result;
    const calls = fetchMock.mock.calls.length;
    expect(calls).toBeGreaterThan(1);
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it.each(['headers', 'body'])('aborts a status request stalled on %s', async (stage) => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, options?: RequestInit) => {
      const requestSignal = options?.signal;
      if (!requestSignal) {
        throw new Error('Expected status request to receive an abort signal');
      }
      signal = requestSignal;
      const stalled = new Promise((_resolve, reject) => {
        requestSignal.addEventListener('abort', () => reject(requestSignal.reason), { once: true });
      });
      return stage === 'headers' ? stalled : Promise.resolve({ status: 200, json: () => stalled });
    });
    const result = expect(poll()).rejects.toThrow('Bluesky video processing timed out after 15 minutes');
    await jest.advanceTimersByTimeAsync(15 * 60 * 1000);
    await result;
    expect(signal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});