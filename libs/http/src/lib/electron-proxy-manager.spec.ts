import { session, type Session } from 'electron';
import {
  clearPartitionProxyCache,
  ensurePartitionProxy,
  onSessionCreated,
  resetGlobalProxyStateForTests,
} from './electron-proxy-manager';
import type { ProxyProfile } from '@postybirb/types';

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
  beforeEach(() => {
    resetGlobalProxyStateForTests();
  });

  it('applies the active global proxy config to the default session', async () => {
    const setProxy = jest.fn().mockResolvedValue(undefined);
    const createdSession = {
      setProxy,
      closeAllConnections: jest.fn(),
    } as unknown as Session;

    await onSessionCreated(createdSession);

    expect(setProxy).toHaveBeenCalledWith({ mode: 'system' });
  });

  it('applies the active global proxy config to partition sessions', async () => {
    const setProxy = jest.fn().mockResolvedValue(undefined);
    const partitionSession = {
      setProxy,
      closeAllConnections: jest.fn(),
    } as unknown as Session;

    await onSessionCreated(partitionSession);

    expect(setProxy).toHaveBeenCalledWith({ mode: 'system' });
  });
});
