import { app, session } from 'electron';
import {
  applyProxy,
  onSessionCreated,
  resetProxyStateForTests,
  resolveSessionProxyConfigForTests,
} from './electron-proxy';

jest.mock('@postybirb/utils/common', () => {
  const actual = jest.requireActual('@postybirb/utils/common');
  return {
    ...actual,
    PostyBirbEnvConfig: { port: '9247' },
  };
});

type ElectronTestModule = typeof import('electron') & {
  __getAppProxyConfig: () => unknown;
  __resetAppProxyConfig: () => void;
  __getSessionProxyConfig: (session: unknown) => unknown;
  __setSessionProxyConfig: (session: unknown, config: unknown) => void;
};

const electronMock = require('electron') as ElectronTestModule;

describe('electron-proxy', () => {
  beforeEach(() => {
    resetProxyStateForTests();
    electronMock.__resetAppProxyConfig();
  });

  describe('resolveSessionProxyConfig', () => {
    it('maps direct mode', () => {
      expect(
        resolveSessionProxyConfigForTests({
          mode: 'direct',
          pool: [],
          routing: {},
        }),
      ).toEqual({ mode: 'direct' });
    });

    it('maps system mode', () => {
      expect(
        resolveSessionProxyConfigForTests({
          mode: 'system',
          pool: [],
          routing: {},
        }),
      ).toEqual({ mode: 'system' });
    });

    it('maps fixed_servers mode with pool entry', () => {
      expect(
        resolveSessionProxyConfigForTests({
          mode: 'fixed_servers',
          fixedProxyId: 'pool-1',
          pool: [
            {
              id: 'pool-1',
              type: 'http',
              host: '10.0.0.1',
              port: '8080',
              username: '',
              password: '',
            },
          ],
          routing: {},
        }),
      ).toEqual({
        mode: 'fixed_servers',
        proxyRules: 'http=10.0.0.1:8080;https=10.0.0.1:8080',
        proxyBypassRules: expect.any(String),
      });
    });

    it('maps pac_routing mode to loopback HTTP PAC URL', () => {
      expect(
        resolveSessionProxyConfigForTests({
          mode: 'pac_routing',
          pacAccessToken: 'secret-token',
          pool: [],
          routing: {},
        }),
      ).toEqual({
        mode: 'pac_script',
        pacScript: 'http://127.0.0.1:9248/api/proxy/pac/secret-token',
      });
    });

    it('falls back to system when PAC token is missing', () => {
      expect(
        resolveSessionProxyConfigForTests({
          mode: 'pac_routing',
          pool: [],
          routing: {},
        }),
      ).toEqual({ mode: 'system' });
    });
  });

  describe('applyProxy', () => {
    it('applies direct mode to default session, app proxy, and partitions', async () => {
      await applyProxy({ mode: 'direct', pool: [], routing: {} }, [
        'account-1',
      ]);

      expect(
        electronMock.__getSessionProxyConfig(session.defaultSession),
      ).toEqual({
        mode: 'direct',
      });
      expect(
        (app as typeof app & { setProxy?: (config: unknown) => Promise<void> })
          .setProxy,
      ).toEqual(expect.any(Function));
      expect(electronMock.__getAppProxyConfig()).toEqual({ mode: 'direct' });

      const partition = session.fromPartition('persist:account-1');
      expect(electronMock.__getSessionProxyConfig(partition)).toEqual({
        mode: 'direct',
      });
    });
  });

  describe('onSessionCreated', () => {
    it('reuses the active session proxy config from the last apply', async () => {
      await applyProxy({ mode: 'direct', pool: [], routing: {} }, []);

      const createdSession = session.fromPartition('persist:new-account');
      electronMock.__setSessionProxyConfig(createdSession, { mode: 'system' });

      await onSessionCreated(createdSession);

      expect(electronMock.__getSessionProxyConfig(createdSession)).toEqual({
        mode: 'direct',
      });
    });
  });

  describe('resetProxyStateForTests', () => {
    it('clears cached proxy configuration', async () => {
      await applyProxy({ mode: 'direct', pool: [], routing: {} }, []);

      resetProxyStateForTests();

      const createdSession = session.fromPartition('persist:after-reset');
      electronMock.__setSessionProxyConfig(createdSession, { mode: 'direct' });

      await onSessionCreated(createdSession);

      expect(electronMock.__getSessionProxyConfig(createdSession)).toEqual({
        mode: 'system',
      });
    });
  });
});
