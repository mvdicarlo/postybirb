import { PlatformService } from '@postybirb/platform';
import { NoopPlatformService } from './noop-platform-providers';

/**
 * Builds a no-op {@link PlatformService} suitable for direct instantiation of
 * website classes in unit tests that bypass DI.
 */
export function createNoopPlatformContext(): PlatformService {
  return new NoopPlatformService();
}
