import { Global, Module } from '@nestjs/common';
import { PlatformService } from '@postybirb/platform';
import { noopPlatformProvider } from './noop-platform-providers';

/**
 * Global test module that provides a no-op {@link PlatformService}
 * implementation. Import this in any test that exercises code depending on
 * platform services (directly or transitively via feature modules).
 */
@Global()
@Module({
  providers: [noopPlatformProvider],
  exports: [PlatformService],
})
export class TestPlatformModule {}
