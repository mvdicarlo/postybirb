import { session, type Session } from 'electron';
import {
  clearPartitionProxyCache,
  ensurePartitionProxy,
  onSessionCreated,
} from './electron-proxy-manager';
import type { ProxyProfile } from '@postybirb/utils/common';

describe('ensurePartitionProxy cache', () => {
  const profile: ProxyProfile = {
    id: 'p1',
    enabled: true,
    type: 'http',
    host: '127.0.0.1',
    port: '8080',
    username: '',
    password: '',
    websites: [],
  };

  beforeEach(() => {
    clearPartitionProxyCache();
  });

  it('skips setProxy when partition fingerprint is unchanged', async () => {
    const partitionSession = session.fromPartition('persist:account-1');
    const setProxySpy = jest.spyOn(partitionSession, 'setProxy');
    const closeSpy = jest.spyOn(partitionSession, 'closeAllConnections');

    await ensurePartitionProxy('account-1', profile);
    await ensurePartitionProxy('account-1', profile);

    expect(setProxySpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('reapplies proxy when force is true', async () => {
    const partitionSession = session.fromPartition('persist:account-2');
    const setProxySpy = jest.spyOn(partitionSession, 'setProxy');

    await ensurePartitionProxy('account-2', profile);
    await ensurePartitionProxy('account-2', profile, true);

    expect(setProxySpy).toHaveBeenCalledTimes(2);
  });
});

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
