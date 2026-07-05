import { Test } from '@nestjs/testing';
import { PlatformService } from '@postybirb/platform';
import { ElectronPlatformService } from './electron-platform.service';
import { ElectronProxyService } from './electron-proxy.service';
import { PlatformModule } from '../platform.module';

describe('ElectronPlatformService', () => {
  it('exposes the same proxy instance through the platform facade', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PlatformModule],
    }).compile();

    const platform = moduleRef.get(ElectronPlatformService);
    const platformFacade = moduleRef.get(PlatformService);

    expect(platform.proxy).toBeInstanceOf(ElectronProxyService);
    expect(platformFacade.proxy).toBe(platform.proxy);

    await moduleRef.close();
  });
});
