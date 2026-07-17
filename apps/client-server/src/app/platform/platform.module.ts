import { Global, Module } from '@nestjs/common';
import { PlatformService } from '@postybirb/platform';
import { SettingsModule } from '../settings/settings.module';
import { ElectronPlatformService } from './electron/electron-platform.service';

/**
 * Wires the abstract {@link PlatformService} token to its concrete Electron
 * implementation and exposes it globally so any feature module can inject
 * it without explicitly importing this module.
 *
 * Tests that need to swap implementations should override the
 * {@link PlatformService} token via Nest's testing utilities.
 */
@Global()
@Module({
  imports: [SettingsModule],
  providers: [{ provide: PlatformService, useClass: ElectronPlatformService }],
  exports: [PlatformService],
})
export class PlatformModule {}
