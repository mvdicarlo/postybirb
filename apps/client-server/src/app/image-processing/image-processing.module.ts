import { Global, Module } from '@nestjs/common';
import { SharpInstanceManager } from './sharp-instance-manager';

/**
 * Global module providing the SharpInstanceManager to all modules.
 * Sharp image processing is isolated in worker threads to protect
 * the main process from native libvips crashes.
 */
@Global()
@Module({
  providers: [SharpInstanceManager],
  exports: [SharpInstanceManager],
})
export class ImageProcessingModule {}
