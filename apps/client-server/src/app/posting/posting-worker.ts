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
import { AccountId, PostId, UnitOfWorkState } from '@postybirb/types';
import { chunk } from 'lodash';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CancellationToken } from './cancellation-token';

type PostingWorkerContext = {
  options: WebsiteOptions[];
  post: Post;
  submission: Submission;
  unitsOfWork: UnitOfWork[];
}

type UnitsOfWorkByAccountId = Record<string, UnitOfWork[]>;

type AccountWork = [accountId: AccountId, unitsOfWork: UnitOfWork[]];

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

  private readonly maxConcurrentBatchSize = 3;

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

      if (post.completed || post.cancelled) {
        this.logger.info(`Post '${post.id}' is no longer eligible for work`);
        return;
      }

      const submission = await this.submissionRepository.findByIdOrThrow(
        post.submissionId,
      );
      const websiteOptions = await this.websiteOptionsRepository.find({
        where: (options, { eq }) => eq(options.submissionId, submission.id),
      });
      const unitsOfWork = await this.unitOfWorkRepository.find({
        where: (unit, { and, eq, ne }) => and(
          eq(unit.postId, post.id),
          eq(unit.evicted, false),
          ne(unit.state, UnitOfWorkState.SUCCEEDED),
        ),
      });

      if (unitsOfWork.length === 0) {
        this.logger.warn(`No unit of work found for post '${post.id}'`);
        await this.completePost();
        return;
      }

      if (websiteOptions.length === 0) {
        this.logger.warn(
          `No website options found for submission '${submission.id}'`,
        );
        // If there are no website options, we cannot proceed with posting.
        // Mark all units of work as cancelled and complete the post.
        await this.updateUnitsOfWorkState(unitsOfWork, UnitOfWorkState.CANCELLED);
        await this.completePost();
        return;
      }

      await this.updateUnitsOfWorkState(unitsOfWork, UnitOfWorkState.PENDING);

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
      const { unitsOfWork } = context;
      const unitsOfWorkByAccountId: UnitsOfWorkByAccountId = {};
      for (const unit of unitsOfWork) {
        if (!unitsOfWorkByAccountId[unit.accountId]) {
          unitsOfWorkByAccountId[unit.accountId] = [];
        }
        unitsOfWorkByAccountId[unit.accountId].push(unit);
      }

      const accountWorkBatches = await this.createAccountWorkBatches(
        Object.entries(unitsOfWorkByAccountId),
      );
      for (const batch of accountWorkBatches) {
        await Promise.all(batch.map(async ([accountId, accountWork]) => {
          try {
            this.logger.info(
              `Processing ${accountWork.length} units of work for account '${accountId}'`,
            );

            await this.post(accountId, accountWork, context);
          } catch (error) {
            this.logger.withError(error).error('Error during posting');
          }
        }));
      }
    } catch (error) {
      this.logger.withError(error).error('Error during execution');
    }
  }

  private async createAccountWorkBatches(accountWork: AccountWork[]): Promise<AccountWork[][]> {
    const standard: AccountWork[] = [];
    const acceptsExternalSources: AccountWork[] = [];

    for (const entry of accountWork) {
      const [accountId] = entry;
      const account = await this.accountRepository.findByIdOrThrow(accountId);
      const websiteInstance = this.websiteRegistry.findInstance(account);
      const acceptsExternalSourceUrls =
        websiteInstance?.decoratedProps.fileOptions
          ?.acceptsExternalSourceUrls ?? false;

      if (acceptsExternalSourceUrls) {
        acceptsExternalSources.push(entry);
      } else {
        standard.push(entry);
      }
    }

    return [
      ...chunk(standard, this.maxConcurrentBatchSize),
      ...chunk(acceptsExternalSources, this.maxConcurrentBatchSize),
    ];
  }

  private async post(accountId: AccountId, unitsOfWork: UnitOfWork[], context: PostingWorkerContext): Promise<void> {
    await this.updateUnitsOfWorkState(unitsOfWork, UnitOfWorkState.EXECUTING);

    const account = await this.accountRepository.findByIdOrThrow(accountId);
    const websiteInstance = this.websiteRegistry.findInstance(account);

    if (!websiteInstance) {
      this.logger.warn(
        `No website instance found for account '${accountId}'`,
      );
    }
  }

  private async updateUnitsOfWorkState(units: UnitOfWork[], state: UnitOfWorkState): Promise<void> {
    await Promise.all(units.map(unit => this.unitOfWorkRepository.update(unit.id, { state })));
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
