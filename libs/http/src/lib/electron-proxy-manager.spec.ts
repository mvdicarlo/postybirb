import type { Session } from 'electron';
import { onSessionCreated } from './electron-proxy-manager';

describe('onSessionCreated', () => {
  it('applies system proxy mode to newly created sessions', async () => {
    const setProxy = jest.fn().mockResolvedValue(undefined);
    const createdSession = {
      setProxy,
    } as unknown as Session;

    await onSessionCreated(createdSession);

    expect(setProxy).toHaveBeenCalledWith({ mode: 'system' });
  });
});
