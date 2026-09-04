import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AccountRepository,
  Post,
  PostRepository,
  Submission,
  SubmissionFile,
  SubmissionFileRepository,
  SubmissionRepository,
  UnitOfWork,
  UnitOfWorkRepository,
  WebsiteOptions,
  WebsiteOptionsRepository,
} from '@postybirb/database';
import {
  Logger,
  PostyBirbLogger,
  trackEvent,
  trackException,
  trackMetric,
} from '@postybirb/logger';
import {
  AccountId,
  FileType,
  IFileBuffer,
  IPostResponse,
  ISubmissionFile,
  IWebsiteFormFields,
  PostData,
  PostId,
  ScheduleType,
  SubmissionId,
  UnitOfWorkState,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { chunk, groupBy } from 'lodash';
import { FileConverterService } from '../file-converter/file-converter.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { publishSubmissionProjectionChanged } from '../submission/submission.events';
import { ValidationService } from '../validation/validation.service';
import {
  PostBatchData,
  PostBatchSourceUrl,
} from '../websites/models/website-modifiers/file-website';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CancellationToken } from './cancellation-token';
import { PostingFile } from './models/posting-file';
import { getImageResizeParameters } from './post-file-resizer/image-resize-parameters';
import { PostFileResizerService } from './post-file-resizer/post-file-resizer.service';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import {
  isUnitOfWorkAttemptSettled,
  selectExecutableWork,
} from './unit-of-work-rate-limit';

type PostingWorkerContext = {
  allUnitsOfWork: UnitOfWork[];
  options: WebsiteOptions[];
  post: Post;
  submission: Submission;
  unitsOfWork: UnitOfWork[];
}

type AccountWork = [accountId: AccountId, unitsOfWork: UnitOfWork[]];

type AccountWorkBatches = {
  standard: AccountWork[][];
  acceptsExternalSources: AccountWork[][];
};

type UnitOfWorkChanges = Parameters<UnitOfWorkRepository['update']>[1];

type PostBatchResult = {
  failed?: boolean;
  rateLimitedUntil?: string;
  response?: IPostResponse;
};

type PostFailureTelemetry = {
  error?: unknown;
  postData?: PostData<IWebsiteFormFields>;
  stage?: string;
};

function mimeTypeIsAccepted(mimeType: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === mimeType) return true;
    // Both 'image/*' and 'image/' mean "any subtype of image".
    const prefix = pattern.endsWith('/*') ? pattern.slice(0, -1) : pattern;
    return prefix.endsWith('/') && mimeType.startsWith(prefix);
  });
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      urls
        .map((url) => url?.trim())
        .filter((url): url is string => Boolean(url)),
    ),
  ];
}

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

  private readonly notifiedFailureAccounts = new Set<AccountId>();

  private sourceProducerWasRateLimited = false;

  private readonly maxConcurrentBatchSize = 3;

  constructor(
    protected readonly postId: PostId,
    protected readonly websiteRegistry: WebsiteRegistryService,
    protected readonly validationService: ValidationService,
    protected readonly postParsersService: PostParsersService,
    protected readonly postFileResizerService: PostFileResizerService,
    protected readonly fileConverterService: FileConverterService,
    protected readonly notificationService: NotificationsService,
    protected readonly postingRateLimiter: PostingRateLimiterService,
    protected readonly onAfterDispose: () => void | Promise<void>,
    protected readonly eventEmitter?: EventEmitter2,
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
      if (this.cancellationToken.aborted) {
        this.logger.info(`Worker for post '${this.postId}' was cancelled`);
        return;
      }

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
      const allUnitsOfWork = await this.unitOfWorkRepository.find({
        where: (unit, { and, eq }) => and(
          eq(unit.postId, post.id),
          eq(unit.evicted, false),
        ),
        orderBy: (unit, { asc }) => asc(unit.createdAt),
      });
      const unitsOfWork = allUnitsOfWork.filter(
        (unit) => !isUnitOfWorkAttemptSettled(unit),
      );

      if (unitsOfWork.length === 0) {
        this.logger.warn(`No unit of work found for post '${post.id}'`);
        await this.completePost(post.submissionId);
        return;
      }

      if (websiteOptions.length === 0) {
        this.logger.warn(
          `No website options found for submission '${submission.id}'`,
        );
        await this.postRepository.cancel(post.id);
        publishSubmissionProjectionChanged(this.eventEmitter, post.submissionId);
        return;
      }

      const executable = await selectExecutableWork(unitsOfWork, (accountId) =>
        this.acceptsExternalSourceUrls(accountId),
      );
      if (executable.length === 0) {
        this.logger.info(`All work for post '${post.id}' is rate limited`);
        return;
      }

      await this.execute({
        allUnitsOfWork,
        options: websiteOptions,
        post,
        submission,
        unitsOfWork: executable,
      });

      if (await this.completePost(post.submissionId)) {
        this.logger.info(`All units of work for post '${post.id}' have been completed`);
      } else {
        this.logger.info(`Some units of work for post '${post.id}' are still pending or failed`);
      }
    } catch (error) {
      this.logger.withError(error).error('Error during processing');
    } finally {
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
      const accountWorkBatches = await this.createAccountWorkBatches(
        Object.entries(groupBy(context.unitsOfWork, (unit) => unit.accountId)),
      );
      await this.processAccountWorkBatches(
        accountWorkBatches.standard,
        context,
      );
      if (this.sourceProducerWasRateLimited) {
        this.logger.info(
          'Deferring external-source accounts until source producers resume',
        );
        return;
      }
      await this.processAccountWorkBatches(
        accountWorkBatches.acceptsExternalSources,
        context,
      );
    } catch (error) {
      this.logger.withError(error).error('Error during execution');
    }
  }

  private async processAccountWorkBatches(
    accountWorkBatches: AccountWork[][],
    context: PostingWorkerContext,
  ): Promise<void> {
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
  }

  private async createAccountWorkBatches(
    accountWork: AccountWork[],
  ): Promise<AccountWorkBatches> {
    const standard: AccountWork[] = [];
    const acceptsExternalSources: AccountWork[] = [];

    for (const entry of accountWork) {
      const [accountId] = entry;
      const acceptsExternalSourceUrls =
        await this.acceptsExternalSourceUrls(accountId);

      if (acceptsExternalSourceUrls) {
        acceptsExternalSources.push(entry);
      } else {
        standard.push(entry);
      }
    }

    return {
      standard: chunk(standard, this.maxConcurrentBatchSize),
      acceptsExternalSources: chunk(
        acceptsExternalSources,
        this.maxConcurrentBatchSize,
      ),
    };
  }

  private async acceptsExternalSourceUrls(
    accountId: AccountId,
  ): Promise<boolean> {
    const account = await this.accountRepository.findByIdOrThrow(accountId);
    return this.websiteRegistry.findInstance(account)?.decoratedProps
      .fileOptions?.acceptsExternalSourceUrls ?? false;
  }

  private async post(accountId: AccountId, unitsOfWork: UnitOfWork[], context: PostingWorkerContext): Promise<void> {
    await this.updateUnits(unitsOfWork, {
      state: UnitOfWorkState.VALIDATING,
    });

    const account = await this.accountRepository.findByIdOrThrow(accountId);
    const websiteInstance = this.websiteRegistry.findInstance(account);

    if (!websiteInstance) {
      const message = `No website instance found for account '${accountId}'`;
      this.logger.warn(message);
      await this.markUnitsOfWorkAsFailed(unitsOfWork, { error: message });
      return;
    }

    if (
      await this.cancelUnitsIfAborted(
        unitsOfWork,
        `before posting for account '${accountId}'`,
      )
    ) {
      return;
    }

    try {
      // Login check
      const loginState = await websiteInstance.login();
      if (!loginState.isLoggedIn) {
        const message =
          `Login failed for account '${accountId}': ${loginState.status}`;
        this.logger.warn(
          message,
        );
        await this.failUnitsOfWork(
          unitsOfWork,
          websiteInstance,
          context.submission,
          message,
        );
        return;
      }
    } catch (error) {
      await this.failUnitsOfWorkWithError(
        unitsOfWork,
        websiteInstance,
        context.submission,
        `Login failed for account '${accountId}'`,
        error,
      );
      return;
    }

    // Website Option Selection
    const websiteOption = context.options.find(opt => opt.accountId === accountId);
    if (!websiteOption) {
      const message = `No website options found for account '${accountId}'`;
      this.logger.warn(message);
      await this.failUnitsOfWork(
        unitsOfWork,
        websiteInstance,
        context.submission,
        message,
      );
      return;
    }

    let postData: PostData<IWebsiteFormFields>;
    try {
      // Post data parsing
      postData = await this.postParsersService.parse(context.submission, websiteInstance, websiteOption, false);
    } catch (error) {
      await this.failUnitsOfWorkWithError(
        unitsOfWork,
        websiteInstance,
        context.submission,
        `Error parsing post data for account '${accountId}'`,
        error,
      );
      return;
    }

    await this.updateUnits(unitsOfWork, {
      data: { postData: { options: postData.options } },
    });

    try {
      // Submission Validation
      const validationResult = await this.validationService.validate(context.submission, websiteOption);
      if (validationResult.errors.length > 0) {
        const message = `Validation failed for account '${accountId}'`;
        this.logger.withMetadata({ errors: validationResult.errors }).warn(
          message,
        );
        await this.failUnitsOfWork(
          unitsOfWork,
          websiteInstance,
          context.submission,
          message,
          {
            error: message,
            validationResult
          },
          { postData },
        );
        return;
      }
    } catch (error) {
      await this.failUnitsOfWorkWithError(
        unitsOfWork,
        websiteInstance,
        context.submission,
        `Error validating post data for account '${accountId}'`,
        error,
        postData,
      );
      return;
    }

    // Pre-flight checks passed, proceed with posting
    const batchedUnitsOfWork = this.getAccountBatches(
      accountId,
      context.allUnitsOfWork,
      unitsOfWork,
      context.submission,
    );

    if (
      await this.cancelUnitsIfAborted(
        unitsOfWork,
        `before posting for account '${accountId}'`,
      )
    ) {
      return;
    }

    for (let index = 0; index < batchedUnitsOfWork.length; index += 1) {
      const { metadata, units } = batchedUnitsOfWork[index];
      if (
        await this.cancelUnitsIfAborted(
          units,
          `during posting for account '${accountId}'`,
        )
      ) {
        continue;
      }

      let result: PostBatchResult;
      try {
        result = await this.postBatch(
          websiteInstance,
          units,
          postData,
          context.submission,
          metadata,
        );
      } catch (error) {
        if (error === this.cancellationToken.signal.reason) {
          this.logger.info(
            `Posting cancelled during batch for account '${accountId}'`,
          );
          await this.updateUnits(units, {
            state: UnitOfWorkState.CANCELLED,
          });
          continue;
        }

        await this.failUnitsOfWorkWithError(
          units,
          websiteInstance,
          context.submission,
          `Error posting batch for account '${accountId}'`,
          error,
          postData,
        );
        result = { failed: true };
      }

      if (result.rateLimitedUntil) {
        const remainingUnits = batchedUnitsOfWork
          .slice(index)
          .flatMap((remainingBatch) => remainingBatch.units);
        await this.updateUnits(remainingUnits, {
          state: UnitOfWorkState.RATE_LIMITED,
          rateLimitedUntil: result.rateLimitedUntil,
          ...(result.response
            ? { response: this.getResponseData(result.response) }
            : {}),
        });
        break;
      }

      if (result.failed) {
        const remainingUnits = batchedUnitsOfWork
          .slice(index + 1)
          .flatMap((remainingBatch) => remainingBatch.units);
        await this.updateUnits(remainingUnits, {
          state: UnitOfWorkState.CANCELLED,
        });
        break;
      }
    }
  }

  /**
   * Marks the units as cancelled when the worker was aborted. Returns whether
   * the caller should stop working on them.
   */
  private async cancelUnitsIfAborted(
    units: UnitOfWork[],
    phase: string,
  ): Promise<boolean> {
    if (!this.cancellationToken.aborted) {
      return false;
    }

    this.logger.info(`Cancellation requested ${phase}`);
    await this.updateUnits(units, { state: UnitOfWorkState.CANCELLED });
    return true;
  }

  private async postBatch(
    websiteInstance: UnknownWebsite,
    unitsOfWork: UnitOfWork[],
    postData: PostData<IWebsiteFormFields>,
    submission: Submission,
    batch: PostBatchData,
  ): Promise<PostBatchResult> {
    const acceptsExternalSourceUrls =
      websiteInstance.decoratedProps.fileOptions?.acceptsExternalSourceUrls ??
      false;
    const { metadata } = websiteInstance.decoratedProps;
    const reservation = await this.postingRateLimiter.acquire(
      websiteInstance.accountId,
      metadata,
    );
    if (!reservation.acquired) {
      if (!reservation.rateLimitedUntil) {
        throw new Error('Rate limiter denied a batch without an expiry');
      }
      if (!acceptsExternalSourceUrls) {
        this.sourceProducerWasRateLimited = true;
      }
      return { rateLimitedUntil: reservation.rateLimitedUntil };
    }

    await this.updateUnits(unitsOfWork, {
      state: UnitOfWorkState.EXECUTING,
      rateLimitedUntil: reservation.rateLimitedUntil ?? null,
    });

    const preparedFiles = await this.prepareBatchFiles(
      websiteInstance,
      unitsOfWork,
    );
    const propagatedSourceUrls = acceptsExternalSourceUrls
      ? await this.getPropagatedSourceUrls(unitsOfWork)
      : [];
    const accountSourceUrls = await this.getAccountSourceUrls(
      websiteInstance.accountId,
      unitsOfWork,
    );
    const files = preparedFiles.map((file) =>
      file.withMetadata({
        ...file.metadata,
        sourceUrls: uniqueUrls([
          ...(file.metadata.sourceUrls ?? []),
          ...propagatedSourceUrls,
        ]),
      }),
    );
    this.cancellationToken.throwIfAborted();
    const response = await websiteInstance.post(
      postData,
      files,
      {
        ...batch,
        ...(accountSourceUrls.length > 0
          ? { sourceUrls: accountSourceUrls }
          : {}),
      },
      this.cancellationToken,
    );

    if (response.rateLimitedUntil) {
      const rateLimitedUntil = await this.postingRateLimiter.setRateLimit(
        websiteInstance.accountId,
        metadata,
        response.rateLimitedUntil,
      );
      if (!acceptsExternalSourceUrls) {
        this.sourceProducerWasRateLimited = true;
      }
      return { rateLimitedUntil, response };
    }

    if (response.exception) {
      if (response.exception === this.cancellationToken.signal.reason) {
        throw response.exception;
      }
      await this.failUnitsOfWork(
        unitsOfWork,
        websiteInstance,
        submission,
        response.message ?? response.exception.message ?? 'Unknown error',
        this.getResponseData(response),
        {
          error: response.exception,
          postData,
          stage: response.stage,
        },
      );
      return { failed: true };
    }

    await this.updateUnits(unitsOfWork, {
      state: UnitOfWorkState.SUCCEEDED,
      response: this.getResponseData(response),
      url: response.sourceUrl,
    });
    this.trackPostSuccess(
      websiteInstance,
      submission,
      unitsOfWork,
      postData,
      response,
    );
    return {};
  }

  private getAccountBatches(
    accountId: AccountId,
    allUnitsOfWork: UnitOfWork[],
    readyUnitsOfWork: UnitOfWork[],
    submission: Submission,
  ): Array<{ metadata: PostBatchData; units: UnitOfWork[] }> {
    const readyIds = new Set(readyUnitsOfWork.map((unit) => unit.id));
    const fileOrder = new Map(
      (submission.files ?? []).map((file) => [file.id, file.order]),
    );
    const getFileOrder = (unit: UnitOfWork): number =>
      (unit.fileId ? fileOrder.get(unit.fileId) : undefined) ??
      Number.MAX_SAFE_INTEGER;
    const orderedUnits = allUnitsOfWork
      .filter((unit) => unit.accountId === accountId)
      .sort(
        (left, right) =>
          getFileOrder(left) - getFileOrder(right) ||
          (left.fileId ?? '').localeCompare(right.fileId ?? '') ||
          left.id.localeCompare(right.id),
      );
    const batches: Array<{
      batchId: string;
      units: UnitOfWork[];
    }> = [];

    // Split an interleaved persisted batch instead of allowing it to jump
    // across another file's current submission order.
    for (const unit of orderedUnits) {
      const batchId = unit.batch ?? 'unknown';
      const currentBatch = batches[batches.length - 1];
      if (!currentBatch || currentBatch.batchId !== batchId) {
        batches.push({ batchId, units: [unit] });
      } else {
        currentBatch.units.push(unit);
      }
    }

    return batches.flatMap((grouped, index) => {
      const readyUnits = grouped.units.filter((unit) => readyIds.has(unit.id));
      return readyUnits.length > 0
        ? [{
            metadata: { index, totalBatches: batches.length },
            units: readyUnits,
          }]
        : [];
    });
  }

  /** Source URLs previously produced by this account on the current post. */
  private async getAccountSourceUrls(
    accountId: AccountId,
    currentUnits: UnitOfWork[],
  ): Promise<PostBatchSourceUrl[]> {
    const currentUnitIds = new Set(currentUnits.map((unit) => unit.id));
    const sourceUnits = await this.unitOfWorkRepository.find({
      where: (unit, { and, eq }) => and(
        eq(unit.postId, this.postId),
        eq(unit.accountId, accountId),
        eq(unit.evicted, false),
      ),
    });
    const sourceUrls = new Map<string, PostBatchSourceUrl>();

    for (const unit of sourceUnits) {
      const url = unit.url?.trim();
      if (!url || unit.evicted || currentUnitIds.has(unit.id)) {
        continue;
      }

      const candidate = { url, timestamp: unit.updatedAt };
      const existing = sourceUrls.get(url);
      if (
        !existing ||
        candidate.timestamp.localeCompare(existing.timestamp) < 0
      ) {
        sourceUrls.set(url, candidate);
      }
    }

    return [...sourceUrls.values()].sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) ||
        left.url.localeCompare(right.url),
    );
  }

  /** Source URLs already produced by the other accounts on this post. */
  private async getPropagatedSourceUrls(
    unitsOfWork: UnitOfWork[],
  ): Promise<string[]> {
    const accountId = unitsOfWork[0]?.accountId;
    if (!accountId) {
      return [];
    }

    const sourceUnits = await this.unitOfWorkRepository.find({
      where: (unit, { and, eq, ne }) => and(
        eq(unit.postId, this.postId),
        eq(unit.evicted, false),
        ne(unit.accountId, accountId),
      ),
    });

    return uniqueUrls(sourceUnits.map((unit) => unit.url));
  }

  private getResponseData(response: IPostResponse): Record<string, unknown> {
    const { exception, ...responseData } = response;
    return exception
      ? {
          ...responseData,
          exception: {
            name: exception.name,
            message: exception.message,
            stack: exception.stack,
          },
        }
      : responseData;
  }

  private trackPostSuccess(
    websiteInstance: UnknownWebsite,
    submission: Submission,
    units: UnitOfWork[],
    postData: PostData<IWebsiteFormFields>,
    response: IPostResponse,
  ): void {
    const websiteName = this.getWebsiteName(websiteInstance);
    trackEvent('PostSuccess', {
      website: websiteName,
      accountId: websiteInstance.accountId,
      submissionId: submission.id,
      submissionType: submission.type,
      hasSourceUrl: response.sourceUrl ? 'true' : 'false',
      fileCount: this.getFileCount(units),
      options: this.redactPostDataForTelemetry(postData),
    });
    trackMetric(`post.success.${websiteName}`, 1, {
      website: websiteName,
      submissionType: submission.type,
    });
  }

  private trackPostFailure(
    websiteInstance: UnknownWebsite,
    submission: Submission,
    units: UnitOfWork[],
    message: string,
    telemetry: PostFailureTelemetry,
  ): void {
    const websiteName = this.getWebsiteName(websiteInstance);
    const exception =
      telemetry.error === undefined
        ? undefined
        : telemetry.error instanceof Error
          ? telemetry.error
          : new Error(this.getErrorMessage(telemetry.error, message));
    trackEvent('PostFailure', {
      website: websiteName,
      accountId: websiteInstance.accountId,
      submissionId: submission.id,
      submissionType: submission.type,
      errorMessage: message,
      stage: telemetry.stage ?? 'unknown',
      hasException: exception ? 'true' : 'false',
      fileCount: this.getFileCount(units),
      options: this.redactPostDataForTelemetry(telemetry.postData),
    });
    trackMetric(`post.failure.${websiteName}`, 1, {
      website: websiteName,
      submissionType: submission.type,
    });
    if (exception) {
      trackException(exception, {
        website: websiteName,
        accountId: websiteInstance.accountId,
        submissionId: submission.id,
        stage: telemetry.stage ?? 'unknown',
        errorMessage: message,
      });
    }
  }

  private getFileCount(units: UnitOfWork[]): string {
    return String(units.filter((unit) => unit.fileId).length);
  }

  private getWebsiteName(websiteInstance: UnknownWebsite): string {
    return websiteInstance.decoratedProps?.metadata?.name ?? 'unknown';
  }

  private redactPostDataForTelemetry(
    postData?: PostData<IWebsiteFormFields>,
  ): string {
    if (!postData) {
      return '';
    }

    const options = { ...postData.options };
    if (options.description) {
      options.description = `[REDACTED ${options.description.length}]`;
    }
    try {
      return JSON.stringify({ options });
    } catch {
      return '';
    }
  }

  private async prepareBatchFiles(
    websiteInstance: UnknownWebsite,
    unitsOfWork: UnitOfWork[],
  ): Promise<PostingFile[]> {
    const fileIds = unitsOfWork.flatMap((unit) =>
      unit.fileId ? [unit.fileId] : [],
    );
    const files = await Promise.all(
      fileIds.map((fileId) => this.fileRepository.findByIdOrThrow(fileId)),
    );

    return Promise.all(
      files.map(async (file) => {
        if (!file.file) {
          await file.load();
        }

        const preparedFile = await this.convertFileIfNeeded(
          websiteInstance,
          file,
        );
        if (getFileType(preparedFile.mimeType) === FileType.IMAGE) {
          return this.resizeImage(websiteInstance, preparedFile);
        }

        return new PostingFile(
          preparedFile.id,
          preparedFile.file,
          preparedFile.thumbnail,
        ).withMetadata(preparedFile.metadata);
      }),
    );
  }

  private async convertFileIfNeeded(
    websiteInstance: UnknownWebsite,
    file: SubmissionFile,
  ): Promise<ISubmissionFile> {
    const acceptedMimeTypes =
      websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
    if (
      acceptedMimeTypes.length === 0 ||
      mimeTypeIsAccepted(file.file.mimeType, acceptedMimeTypes)
    ) {
      return file;
    }

    const primaryFile = await this.convertToAcceptedMimeType(
      file.file,
      acceptedMimeTypes,
    );
    if (primaryFile) {
      return this.withPreparedFile(file, primaryFile);
    }

    if (!file.altFile && file.altFileId) {
      await file.load('alt');
    }
    if (file.altFile) {
      const alternateFile = mimeTypeIsAccepted(
        file.altFile.mimeType,
        acceptedMimeTypes,
      )
        ? file.altFile
        : await this.convertToAcceptedMimeType(
            file.altFile,
            acceptedMimeTypes,
          );
      if (alternateFile) {
        return this.withPreparedFile(file, alternateFile);
      }
    }

    throw new Error(
      `File '${file.fileName}' has unsupported MIME type '${file.mimeType}' and cannot be converted for account '${websiteInstance.accountId}'`,
    );
  }

  private async convertToAcceptedMimeType(
    file: IFileBuffer,
    acceptedMimeTypes: string[],
  ): Promise<IFileBuffer | undefined> {
    if (
      !(await this.fileConverterService.canConvert(
        file.mimeType,
        acceptedMimeTypes,
      ))
    ) {
      return undefined;
    }

    const convertedFile = await this.fileConverterService.convert(
      file,
      acceptedMimeTypes,
    );
    if (!mimeTypeIsAccepted(convertedFile.mimeType, acceptedMimeTypes)) {
      throw new Error(
        `File converter returned unsupported MIME type '${convertedFile.mimeType}'`,
      );
    }
    return convertedFile;
  }

  private withPreparedFile(
    file: SubmissionFile,
    preparedFile: IFileBuffer,
  ): ISubmissionFile {
    return {
      ...file,
      file: preparedFile,
      fileName: preparedFile.fileName,
      mimeType: preparedFile.mimeType,
      size: preparedFile.buffer.length,
      width: preparedFile.width,
      height: preparedFile.height,
    };
  }

  private async resizeImage(
    websiteInstance: UnknownWebsite,
    file: ISubmissionFile,
  ): Promise<PostingFile> {
    return this.postFileResizerService.resize({
      file,
      resize: getImageResizeParameters(websiteInstance, file),
    });
  }

  private async updateUnits(
    units: UnitOfWork[],
    changes: UnitOfWorkChanges,
  ): Promise<void> {
    if (units.length === 0) {
      return;
    }

    await Promise.all(
      units.map((unit) => this.unitOfWorkRepository.update(unit.id, changes)),
    );
    publishSubmissionProjectionChanged(
      this.eventEmitter,
      units.map((unit) => unit.submissionId),
    );
  }

  private async markUnitsOfWorkAsFailed(
    units: UnitOfWork[],
    response: Record<string, unknown>,
  ): Promise<void> {
    await this.updateUnits(units, {
      state: UnitOfWorkState.FAILED,
      response,
    });
  }

  private async failUnitsOfWork(
    units: UnitOfWork[],
    websiteInstance: UnknownWebsite,
    submission: Submission,
    message: string,
    response: Record<string, unknown> = { error: message },
    telemetry: PostFailureTelemetry = {},
  ): Promise<void> {
    await this.markUnitsOfWorkAsFailed(units, response);
    await this.notifyPostFailure(websiteInstance, submission, message);
    this.trackPostFailure(
      websiteInstance,
      submission,
      units,
      message,
      telemetry,
    );
  }

  /** Logs a thrown error and fails the units with its message. */
  private async failUnitsOfWorkWithError(
    units: UnitOfWork[],
    websiteInstance: UnknownWebsite,
    submission: Submission,
    message: string,
    error: unknown,
    postData?: PostData<IWebsiteFormFields>,
  ): Promise<void> {
    this.logger.withError(error).error(message);
    await this.failUnitsOfWork(
      units,
      websiteInstance,
      submission,
      this.getErrorMessage(error, message),
      { error: message },
      { error, postData },
    );
  }

  private async notifyPostFailure(
    websiteInstance: UnknownWebsite,
    submission: Submission,
    message: string,
  ): Promise<void> {
    if (this.notifiedFailureAccounts.has(websiteInstance.accountId)) {
      return;
    }
    this.notifiedFailureAccounts.add(websiteInstance.accountId);

    const { metadata } = websiteInstance.decoratedProps;
    try {
      await this.notificationService.create(
        {
          type: 'error',
          title: `Failed to post to ${metadata.displayName}`,
          message,
          tags: ['post', 'post-failure', metadata.displayName],
          data: {
            submissionId: submission.id,
            submissionType: submission.type,
          },
        },
        true,
      );
    } catch (error) {
      this.logger.withError(error).error('Failed to create post notification');
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return typeof error === 'string' && error ? error : fallback;
  }

  private async completePost(submissionId: SubmissionId): Promise<boolean> {
    try {
      const completed = await this.postRepository.completeIfAllActiveUnitsSettled(
        this.postId,
      );
      if (completed) {
        const units = await this.unitOfWorkRepository.find({
          where: (unit, { and, eq }) =>
            and(eq(unit.postId, this.postId), eq(unit.evicted, false)),
        });
        const allSucceeded =
          units.length > 0 &&
          units.every((unit) => unit.state === UnitOfWorkState.SUCCEEDED);
        const submission = await this.submissionRepository.findByIdOrThrow(
          submissionId,
        );

        if (allSucceeded) {
          const isRecurringScheduled =
            submission.isScheduled &&
            submission.schedule.scheduleType === ScheduleType.RECURRING;
          if (!isRecurringScheduled && !submission.isArchived) {
            await this.submissionRepository.update(submissionId, {
              isArchived: true,
            });
          }
        }
        await this.notifyPostCompletion(submission, units, allSucceeded);
        publishSubmissionProjectionChanged(this.eventEmitter, submissionId);
      }
      return completed;
    } catch (error) {
      this.logger.withError(error).error('Error during post completion');
      return false;
    }
  }

  private async notifyPostCompletion(
    submission: Submission,
    units: UnitOfWork[],
    allSucceeded: boolean,
  ): Promise<void> {
    const submissionName = submission.getSubmissionName() ?? 'Submission';
    const data = {
      submissionId: submission.id,
      submissionType: submission.type,
    };

    try {
      if (allSucceeded) {
        await this.notificationService.create(
          {
            type: 'success',
            title: 'Post Completed',
            message: `Successfully posted "${submissionName}" to all websites`,
            tags: ['post', 'post-success'],
            data,
          },
          true,
        );
        return;
      }

      const failedCount = units.filter(
        (unit) => unit.state === UnitOfWorkState.FAILED,
      ).length;
      await this.notificationService.create(
        {
          type: 'warning',
          title: 'Post Incomplete',
          message:
            failedCount > 0
              ? `"${submissionName}" failed to post to ${failedCount} website(s)`
              : `"${submissionName}" failed to post`,
          tags: ['post', 'post-incomplete'],
          data: { ...data, failedCount },
        },
        true,
      );
    } catch (error) {
      this.logger
        .withError(error)
        .error('Failed to create post completion notification');
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
