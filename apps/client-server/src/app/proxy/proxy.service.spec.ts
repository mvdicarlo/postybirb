import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { BadRequestException } from '@nestjs/common';
import {
  applyGlobalProxyConfig,
  invalidateAppliedGlobalProxyFingerprint,
  probePoolEntryConnection,
} from '@postybirb/http';
import { StartupOptionsManager } from '@postybirb/utils/common';
import { ProxyService } from './proxy.service';

jest.mock('@postybirb/http', () => ({
  probePoolEntryConnection: jest.fn(),
  applyGlobalProxyConfig: jest.fn().mockResolvedValue(undefined),
  invalidateAppliedGlobalProxyFingerprint: jest.fn(),
}));

describe('ProxyService', () => {
  let service: ProxyService;
  let tmpDir: string;

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
    service = new ProxyService();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns auth failure when probe receives HTTP 407', async () => {
    jest.mocked(probePoolEntryConnection).mockResolvedValue({ statusCode: 407 });

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
    jest.mocked(probePoolEntryConnection).mockResolvedValue({ statusCode: 204 });

    await service.testPoolEntryConnection({
      id: 'pool-1',
      type: 'http',
      host: '127.0.0.1',
      port: '8080',
      username: 'saved-user',
      password: '',
    });

    expect(probePoolEntryConnection).toHaveBeenCalledWith(
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

  it('saveConfiguration preserves saved pool passwords', async () => {
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
    expect(invalidateAppliedGlobalProxyFingerprint).not.toHaveBeenCalled();
    expect(applyGlobalProxyConfig).not.toHaveBeenCalled();
  });
});
