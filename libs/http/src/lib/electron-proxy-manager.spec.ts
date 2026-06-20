import { session, type Session } from 'electron';
import { onSessionCreated } from './electron-proxy-manager';

describe('onSessionCreated', () => {
  it('applies system proxy mode to the default session only', async () => {
    const setProxy = jest.fn().mockResolvedValue(undefined);
    const createdSession = {
      setProxy,
    } as unknown as Session;

    Object.defineProperty(session, 'defaultSession', {
      configurable: true,
      value: createdSession,
    });

    await onSessionCreated(createdSession);

    expect(setProxy).toHaveBeenCalledWith({ mode: 'system' });
  });

  it('does not override proxy on partition sessions', async () => {
    const setProxy = jest.fn().mockResolvedValue(undefined);
    const partitionSession = {
      setProxy,
    } as unknown as Session;
    const defaultSession = {
      setProxy: jest.fn().mockResolvedValue(undefined),
    } as unknown as Session;

    Object.defineProperty(session, 'defaultSession', {
      configurable: true,
      value: defaultSession,
    });

    await onSessionCreated(partitionSession);

    expect(setProxy).not.toHaveBeenCalled();
  });
});
