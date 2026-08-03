import {
  AccountRepository,
  Post,
  PostRepository,
  Submission,
  SubmissionFileRepository,
  SubmissionRepository,
  UnitOfWork,
  UnitOfWorkRepository,
  WebsiteOptions,
  WebsiteOptionsRepository,
} from '@postybirb/database';
import { Logger, PostyBirbLogger } from '@postybirb/logger';
import { PostId } from '@postybirb/types';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CancellationToken } from './cancellation-token';

type PostingWorkerContext = {
  options: WebsiteOptions[];
  post: Post;
  submission: Submission;
  unitsOfWork: UnitOfWork[];
}

type UnitsOfWorkByAccountId = Record<string, UnitOfWork[]>;

export class PostingWorker {
  private readonly logger: PostyBirbLogger;

  protected readonly cancellationToken = new CancellationToken();

  protected readonly submissionRepository = new SubmissionRepository();

  protected readonly fileRepository = new SubmissionFileRepository();

  protected readonly unitOfWorkRepository = new UnitOfWorkRepository();

  protected readonly postRepository = new PostRepository();

  protected readonly accountRepository = new AccountRepository();

  protected readonly websiteOptionsRepository = new WebsiteOptionsRepository();

  private started = false;

  private disposed = false;

  constructor(
    protected readonly postId: PostId,
    protected readonly websiteRegistry: WebsiteRegistryService,
    protected readonly onAfterDispose: () => void | Promise<void>,
  ) {
    this.logger = Logger(`PostingWorker[${postId}]`);
  }

  public async start(): Promise<void> {
    if (this.started) {
      this.logger.warn(`Worker for post '${this.postId}' is already started`);
      return;
    }
    this.started = true;

    this.logger.info(`Starting worker for post '${this.postId}'`);
    try {
      this.cancellationToken.throwIfAborted();
      const post = await this.postRepository.findByIdOrThrow(this.postId);
      this.cancellationToken.throwIfAborted();

      if (post.completed || post.cancelled) {
        this.logger.debug(`Post '${post.id}' is no longer eligible for work`);
        return;
      }

      const submission = await this.submissionRepository.findByIdOrThrow(
        post.submissionId,
      );
      this.cancellationToken.throwIfAborted();
      const websiteOptions = await this.websiteOptionsRepository.find({
        where: (options, { eq }) => eq(options.submissionId, submission.id),
      });
      this.cancellationToken.throwIfAborted();

      if (websiteOptions.length === 0) {
        this.logger.warn(
          `No website options found for submission '${submission.id}'`,
        );
        await this.completePost();
        return;
      }

      const unitsOfWork = await this.unitOfWorkRepository.find({
        where: (unit, { eq }) => eq(unit.postId, post.id),
      });
      this.cancellationToken.throwIfAborted();

      if (unitsOfWork.length === 0) {
        this.logger.warn(`No unit of work found for post '${post.id}'`);
        await this.completePost();
      }

      await this.execute({
        options: websiteOptions,
        post,
        submission,
        unitsOfWork,
      });
    } catch (error) {
      if (this.cancellationToken.aborted) {
        this.logger.info(`Worker for post '${this.postId}' was cancelled`);
      } else {
        this.logger.withError(error).error('Error during processing');
      }
    } finally {
      if (this.cancellationToken.aborted) {
        await this.completePost();
      }
      await this.dispose();
    }
  }

  public cancel(reason: string): boolean {
    if (this.cancellationToken.aborted) {
      this.logger.warn('Cancellation requested but worker is already aborted');
      return false;
    }

    this.logger.info(`Cancelling worker due to reason: ${reason}`);
    this.cancellationToken.abort(reason);
    return true;
  }

  private async execute(context: PostingWorkerContext): Promise<void> {
    try {
      const { options, post, submission, unitsOfWork } = context;
      const unitsOfWorkByAccountId: UnitsOfWorkByAccountId = {};
      for (const unit of unitsOfWork) {
        if (!unitsOfWorkByAccountId[unit.accountId]) {
          unitsOfWorkByAccountId[unit.accountId] = [];
        }
        unitsOfWorkByAccountId[unit.accountId].push(unit);
      }

      // TODO send off by account to website for processing, and handle results
    } catch (error) {
      this.logger.withError(error).error('Error during execution');
    }
  }

  private async completePost(): Promise<void> {
    try {
      await this.postRepository.update(this.postId, {
        completed: true,
        cancelled: this.cancellationToken.aborted,
      });
    } catch (error) {
      this.logger.withError(error).error('Error during post completion');
    }
  }

  private async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    try {
      this.logger.info('Disposing worker');
      await this.onAfterDispose();
    } catch (error) {
      this.logger.withError(error).error('Error during disposal');
    }
  }
}
