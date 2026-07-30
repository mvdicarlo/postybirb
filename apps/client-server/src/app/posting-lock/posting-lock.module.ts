import { Module } from '@nestjs/common';
import { PostingLockService } from './posting-lock.service';

/**
 * Dependency-free module so both the post engine and the submission side can
 * import it without a circular module reference.
 */
@Module({
  providers: [PostingLockService],
  exports: [PostingLockService],
})
export class PostingLockModule {}
