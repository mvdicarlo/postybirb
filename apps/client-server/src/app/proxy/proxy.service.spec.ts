import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { AccountRepository } from '@postybirb/database';
import * as CommonUtils from '@postybirb/utils/common';
import { StartupOptionsManager } from '@postybirb/utils/common';
import { ProxyService } from './proxy.service';

describe('ProxyService', () => {
  let service: ProxyService;
  let tmpDir: string;
  const platform = {
    proxy: {
      applyProxy: jest.fn().mockResolvedValue(undefined),
    },
  };
  const accountRepository = {
    find: jest.fn(),
    table: { id: 'id' },
  } as unknown as AccountRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = mkdtempSync(join(tmpdir(), 'postybirb-proxy-service-test-'));
    StartupOptionsManager.configure({
      storagePath: join(tmpDir, 'startup.json'),
      defaultAppDataPath: '/default/path',
    });
    StartupOptionsManager.set({
      proxy: {
        mode: 'pac_routing',
        pool: [
          {
            id: 'pool-1',
            type: 'http',
            host: '127.0.0.1',
            port: '8080',
            username: 'saved-user',
            password: 'saved-pass',
          },
        ],
        routing: {},
      },
    });
    service = new ProxyService(platform as never, accountRepository);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saveConfiguration persists invalid pool entries as provided', async () => {
    await service.saveConfiguration({
      mode: 'fixed_servers',
      fixedProxyId: 'pool-1',
      pool: [
        {
          id: 'pool-1',
          type: 'http',
          host: '',
          port: '8080',
          username: '',
          password: '',
        },
      ],
      routing: {},
    });

    const saved = JSON.parse(
      readFileSync(join(tmpDir, 'startup.json'), 'utf-8'),
    );

    expect(saved.proxy.pool[0].host).toBe('');
  });

  it('saveConfiguration persists proxy without applying in test env', async () => {
    await service.saveConfiguration({
      mode: 'pac_routing',
      pool: [
        {
          id: 'pool-1',
          type: 'http',
          host: '127.0.0.1',
          port: '8080',
          username: 'saved-user',
          password: '',
        },
      ],
      routing: {},
    });

    const saved = JSON.parse(
      readFileSync(join(tmpDir, 'startup.json'), 'utf-8'),
    );

    expect(saved.proxy.pool[0].password).toBe('saved-pass');
    expect(platform.proxy.applyProxy).not.toHaveBeenCalled();
  });

  it('saveConfiguration generates pacAccessToken on first PAC routing save', async () => {
    await service.saveConfiguration({
      mode: 'pac_routing',
      pool: [
        {
          id: 'pool-1',
          type: 'http',
          host: '127.0.0.1',
          port: '8080',
          username: '',
          password: '',
        },
      ],
      routing: { telegram: 'system' },
    });

    const saved = JSON.parse(
      readFileSync(join(tmpDir, 'startup.json'), 'utf-8'),
    );

    expect(saved.proxy.pacAccessToken).toEqual(expect.any(String));
    expect(saved.proxy.pacAccessToken.length).toBeGreaterThanOrEqual(32);
  });

  it('scheduleApply queues a follow-up apply when called in-flight', async () => {
    const isTestSpy = jest
      .spyOn(CommonUtils, 'IsTestEnvironment')
      .mockReturnValue(false);

    let resolver: (() => void) | undefined;
    const firstApplyGate = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    let applyCount = 0;
    const applySpy = jest
      .spyOn(service, 'apply')
      .mockImplementation(async () => {
        applyCount += 1;
        if (applyCount === 1) {
          await firstApplyGate;
        }
      });

    const firstRun = service.scheduleApply();
    const secondRun = service.scheduleApply();
    expect(secondRun).toBe(firstRun);

    if (resolver) {
      resolver();
    }
    await firstRun;

    expect(applySpy).toHaveBeenCalledTimes(2);

    applySpy.mockRestore();
    isTestSpy.mockRestore();
  });
});
