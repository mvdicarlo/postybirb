import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BadRequestException } from '@nestjs/common';
import { applyProxy } from '@postybirb/http';
import * as CommonUtils from '@postybirb/utils/common';
import { StartupOptionsManager } from '@postybirb/utils/common';
import { ProxyService } from './proxy.service';
import { probeProxyPoolEntry } from './proxy-pool-probe';

jest.mock('@postybirb/http', () => ({
  applyProxy: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./proxy-pool-probe', () => ({
  probeProxyPoolEntry: jest.fn(),
}));

describe('ProxyService', () => {
  let service: ProxyService;
  let tmpDir: string;
  const accountRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

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
    service = new ProxyService(accountRepository as never);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns auth failure when probe receives HTTP 407', async () => {
    jest.mocked(probeProxyPoolEntry).mockResolvedValue({ statusCode: 407 });

    await expect(
      service.testPoolEntryConnection({
        id: 'pool-1',
        type: 'http',
        host: '127.0.0.1',
        port: '8080',
        username: 'saved-user',
        password: '',
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Proxy authentication failed. Check username and password.',
    });
  });

  it('preserves saved password when the client omits it on test', async () => {
    jest.mocked(probeProxyPoolEntry).mockResolvedValue({ statusCode: 204 });

    await service.testPoolEntryConnection({
      id: 'pool-1',
      type: 'http',
      host: '127.0.0.1',
      port: '8080',
      username: 'saved-user',
      password: '',
    });

    expect(probeProxyPoolEntry).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'saved-pass' }),
      'https://www.google.com/generate_204',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('saveConfiguration rejects invalid pool entries', async () => {
    await expect(
      service.saveConfiguration({
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
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
    expect(applyProxy).not.toHaveBeenCalled();
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

    let resolver: (() => void) | null = null;
    const firstApplyGate = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    let applyCount = 0;
    const applySpy = jest.spyOn(service, 'apply').mockImplementation(async () => {
      applyCount += 1;
      if (applyCount === 1) {
        await firstApplyGate;
      }
    });

    const firstRun = service.scheduleApply();
    const secondRun = service.scheduleApply();
    expect(secondRun).toBe(firstRun);

    resolver?.();
    await firstRun;

    expect(applySpy).toHaveBeenCalledTimes(2);

    applySpy.mockRestore();
    isTestSpy.mockRestore();
  });
});
