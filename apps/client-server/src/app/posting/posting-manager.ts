import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { PostId } from '@postybirb/types';
import { Mutex } from 'async-mutex';
import { FileConverterService } from '../file-converter/file-converter.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { PostFileResizerService } from '../post/services/post-file-resizer/post-file-resizer.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import { PostingWorker } from './posting-worker';

@Injectable()
export class PostingManager {
  private readonly logger = Logger(PostingManager.name);

  private readonly submitMutex = new Mutex();

  private readonly acceptedJobs = new Set<PostId>();

  private readonly maxAcceptedJobs = 3;

  private readonly workers: Map<PostId, PostingWorker> = new Map();

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly validationService: ValidationService,
    private readonly postParsersService: PostParsersService,
    private readonly postFileResizerService: PostFileResizerService,
    private readonly fileConverterService: FileConverterService,
    private readonly notificationService: NotificationsService,
    private readonly postingRateLimiter: PostingRateLimiterService,
  ) {}

  public submit(postId: PostId): Promise<boolean> {
    return this.submitMutex.runExclusive(() => {
      if (this.acceptedJobs.has(postId)) {
        return false;
      }

      if (this.acceptedJobs.size >= this.maxAcceptedJobs) {
        return false;
      }

      this.acceptedJobs.add(postId);
      this.logger.debug(`Accepted post '${postId}'`);
      this.allocateWorker(postId);
      return true;
    });
  }

  public cancel(postId: PostId, reason: string): Promise<boolean> {
    return this.submitMutex.runExclusive(() => {
      const worker = this.workers.get(postId);
      if (!worker) {
        this.logger.warn(
          `Attempted to cancel post '${postId}' but it was not accepted`,
        );
        return false;
      }

      worker.cancel(reason);
      this.logger.info(`Cancellation requested for post '${postId}'`);
      return true;
    });
  }

  private allocateWorker(postId: PostId): void {
    this.logger.info(`Allocating worker for post '${postId}'`);
    const worker = this.createWorker(postId, () =>
      this.releaseWorker(postId, worker),
    );
    this.workers.set(postId, worker);
    worker.start().catch((error) => {
      this.logger.withError(error).error(`Worker for post '${postId}' failed`);
      return this.releaseWorker(postId, worker);
    });
  }

  protected createWorker(
    postId: PostId,
    onAfterDispose: () => void | Promise<void>,
  ): PostingWorker {
    return new PostingWorker(
      postId,
      this.websiteRegistry,
      this.validationService,
      this.postParsersService,
      this.postFileResizerService,
      this.fileConverterService,
      this.notificationService,
      this.postingRateLimiter,
      onAfterDispose,
    );
  }

  private releaseWorker(postId: PostId, worker: PostingWorker): Promise<void> {
    return this.submitMutex.runExclusive(() => {
      if (this.workers.get(postId) !== worker) {
        return;
      }

      this.workers.delete(postId);
      this.acceptedJobs.delete(postId);
      this.logger.debug(`Released post '${postId}'`);
    });
  }
}
