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
import { Logger, PostyBirbLogger } from '@postybirb/logger';
import {
  AccountId,
  FileType,
  IFileBuffer,
  IPostResponse,
  ISubmissionFile,
  IWebsiteFormFields,
  PostData,
  PostId,
  UnitOfWorkState,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { chunk } from 'lodash';
import { FileConverterService } from '../file-converter/file-converter.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { PostingFile } from '../post/models/posting-file';
import { getImageResizeParameters } from '../post/services/post-file-resizer/image-resize-parameters';
import { PostFileResizerService } from '../post/services/post-file-resizer/post-file-resizer.service';
import { ValidationService } from '../validation/validation.service';
import { PostBatchData } from '../websites/models/website-modifiers/file-website';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CancellationToken } from './cancellation-token';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import {
  filterSourceDependentWork,
  isUnitOfWorkAttemptSettled,
  partitionUnitsOfWorkByRateLimit,
} from './unit-of-work-rate-limit';

type PostingWorkerContext = {
  allUnitsOfWork: UnitOfWork[];
  options: WebsiteOptions[];
  post: Post;
  submission: Submission;
  unitsOfWork: UnitOfWork[];
}

type UnitsOfWorkByAccountId = Record<string, UnitOfWork[]>;

type AccountWork = [accountId: AccountId, unitsOfWork: UnitOfWork[]];

type AccountWorkBatches = {
  standard: AccountWork[][];
  acceptsExternalSources: AccountWork[][];
};

function mimeTypeIsAccepted(mimeType: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === mimeType) return true;
    if (pattern.endsWith('/*')) {
      return mimeType.startsWith(pattern.slice(0, -1));
    }
    if (pattern.endsWith('/')) {
      return mimeType.startsWith(pattern);
    }
    return false;
  });
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
        await this.completePost();
        return;
      }

      if (websiteOptions.length === 0) {
        this.logger.warn(
          `No website options found for submission '${submission.id}'`,
        );
        await this.postRepository.cancel(post.id);
        return;
      }

      const { ready, deferred } =
        partitionUnitsOfWorkByRateLimit(unitsOfWork);
      const executable = await filterSourceDependentWork(
        ready,
        deferred,
        (accountId) => this.acceptsExternalSourceUrls(accountId),
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

      if (await this.completePost()) {
        this.logger.info(`All units of work for post '${post.id}' have been completed`);
      } else {
        this.logger.info(`Some units of work for post '${post.id}' are still pending or failed`);
      }
    } catch (error) {
      if (this.cancellationToken.aborted) {
        this.logger.info(`Worker for post '${this.postId}' was cancelled`);
      } else {
        this.logger.withError(error).error('Error during processing');
      }
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
    await this.updateUnitsOfWorkState(unitsOfWork, UnitOfWorkState.VALIDATING);

    const account = await this.accountRepository.findByIdOrThrow(accountId);
    const websiteInstance = this.websiteRegistry.findInstance(account);

    if (!websiteInstance) {
      this.logger.warn(
        `No website instance found for account '${accountId}'`,
      );
      await this.markUnitsOfWorkAsFailed(unitsOfWork, {
        error: `No website instance found for account '${accountId}'`,
      });
      return;
    }

    if (this.cancellationToken.aborted) {
      this.logger.info(`Cancellation requested before posting for account '${accountId}'`);
      await this.updateUnitsOfWorkState(unitsOfWork, UnitOfWorkState.CANCELLED);
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
      const message = `Login failed for account '${accountId}'`;
      this.logger.withError(error).error(
        message,
      );
      await this.failUnitsOfWork(
        unitsOfWork,
        websiteInstance,
        context.submission,
        this.getErrorMessage(error, message),
        { error: message },
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
      const message = `Error parsing post data for account '${accountId}'`;
      this.logger.withError(error).error(
        message,
      );
      await this.failUnitsOfWork(
        unitsOfWork,
        websiteInstance,
        context.submission,
        this.getErrorMessage(error, message),
        { error: message },
      );
      return;
    }

    await this.updateUnitsOfWorkData(unitsOfWork, { postData });

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
        );
        return;
      }
    } catch (error) {
      const message = `Error validating post data for account '${accountId}'`;
      this.logger.withError(error).error(
        message,
      );
      await this.failUnitsOfWork(
        unitsOfWork,
        websiteInstance,
        context.submission,
        this.getErrorMessage(error, message),
        { error: message },
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

    if (this.cancellationToken.aborted) {
      this.logger.info(`Cancellation requested before posting for account '${accountId}'`);
      await this.updateUnitsOfWorkState(unitsOfWork, UnitOfWorkState.CANCELLED);
      return;
    }

    for (const { metadata, units } of batchedUnitsOfWork) {
      if (this.cancellationToken.aborted) {
        this.logger.info(`Cancellation requested during posting for account '${accountId}'`);
        await this.updateUnitsOfWorkState(units, UnitOfWorkState.CANCELLED);
        continue;
      }

      try {
        await this.postBatch(
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
          await this.updateUnitsOfWorkState(
            units,
            UnitOfWorkState.CANCELLED,
          );
          continue;
        }

        const message = `Error posting batch for account '${accountId}'`;
        this.logger.withError(error).error(
          message,
        );
        await this.failUnitsOfWork(
          units,
          websiteInstance,
          context.submission,
          this.getErrorMessage(error, message),
          { error: message },
        );
      }
    }
  }

  private async postBatch(
    websiteInstance: UnknownWebsite,
    unitsOfWork: UnitOfWork[],
    postData: PostData<IWebsiteFormFields>,
    submission: Submission,
    batch: PostBatchData,
  ): Promise<void> {
    const reservation = await this.postingRateLimiter.acquire(
      websiteInstance.accountId,
      websiteInstance.decoratedProps.metadata,
    );
    if (!reservation.acquired) {
      if (!reservation.rateLimitedUntil) {
        throw new Error('Rate limiter denied a batch without an expiry');
      }
      await Promise.all(
        unitsOfWork.map((unit) =>
          this.unitOfWorkRepository.update(unit.id, {
            state: UnitOfWorkState.RATE_LIMITED,
            rateLimitedUntil: reservation.rateLimitedUntil,
          }),
        ),
      );
      if (
        !websiteInstance.decoratedProps.fileOptions
          ?.acceptsExternalSourceUrls
      ) {
        this.sourceProducerWasRateLimited = true;
      }
      return;
    }

    await Promise.all(
      unitsOfWork.map((unit) =>
        this.unitOfWorkRepository.update(unit.id, {
          state: UnitOfWorkState.EXECUTING,
          rateLimitedUntil: reservation.rateLimitedUntil ?? null,
        }),
      ),
    );

    const preparedFiles = await this.prepareBatchFiles(
      websiteInstance,
      unitsOfWork,
    );
    const propagatedSourceUrls = websiteInstance.decoratedProps.fileOptions
      ?.acceptsExternalSourceUrls
      ? await this.getPropagatedSourceUrls(unitsOfWork)
      : [];
    const files = preparedFiles.map((file) =>
      file.withMetadata({
        ...file.metadata,
        sourceUrls: [
          ...(file.metadata.sourceUrls ?? []),
          ...propagatedSourceUrls,
        ]
          .map((url) => url.trim())
          .filter((url, index, urls) => url && urls.indexOf(url) === index),
      }),
    );
    this.cancellationToken.throwIfAborted();
    const response = await websiteInstance.post(
      postData,
      files,
      batch,
      this.cancellationToken,
    );
    const responseData = this.getResponseData(response);

    if (response.exception) {
      if (response.exception === this.cancellationToken.signal.reason) {
        throw response.exception;
      }
      await this.failUnitsOfWork(
        unitsOfWork,
        websiteInstance,
        submission,
        response.message ?? response.exception.message ?? 'Unknown error',
        responseData,
      );
      return;
    }

    await Promise.all(
      unitsOfWork.map((unit) =>
        this.unitOfWorkRepository.update(unit.id, {
          state: UnitOfWorkState.SUCCEEDED,
          response: responseData,
          url: response.sourceUrl,
        }),
      ),
    );
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
    const batches = new Map<string, {
      firstSeen: number;
      order: number;
      units: UnitOfWork[];
    }>();

    allUnitsOfWork
      .filter((unit) => unit.accountId === accountId)
      .forEach((unit, index) => {
        const batchId = unit.batch ?? 'unknown';
        const grouped = batches.get(batchId) ?? {
          firstSeen: index,
          order: Number.MAX_SAFE_INTEGER,
          units: [],
        };
        grouped.units.push(unit);
        if (unit.fileId) {
          grouped.order = Math.min(
            grouped.order,
            fileOrder.get(unit.fileId) ?? Number.MAX_SAFE_INTEGER,
          );
        }
        batches.set(batchId, grouped);
      });

    const orderedBatches = [...batches.values()].sort(
      (left, right) =>
        left.order - right.order || left.firstSeen - right.firstSeen,
    );
    return orderedBatches.flatMap((grouped, index) => {
      const readyUnits = grouped.units.filter((unit) => readyIds.has(unit.id));
      return readyUnits.length > 0
        ? [{
            metadata: { index, totalBatches: orderedBatches.length },
            units: readyUnits,
          }]
        : [];
    });
  }

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

    return sourceUnits
      .filter(
        (unit) =>
          unit.postId === this.postId &&
          !unit.evicted &&
          unit.accountId !== accountId,
      )
      .map((unit) => unit.url?.trim())
      .filter(
        (url, index, urls): url is string =>
          Boolean(url) && urls.indexOf(url) === index,
      );
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

  private async updateUnitsOfWorkState(units: UnitOfWork[], state: UnitOfWorkState): Promise<void> {
    await Promise.all(units.map(unit => this.unitOfWorkRepository.update(unit.id, { state })));
  }

  private async markUnitsOfWorkAsFailed(units: UnitOfWork[], response?: Record<string, unknown>): Promise<void> {
    await Promise.all(units.map(unit => this.unitOfWorkRepository.update(unit.id, {
      state: UnitOfWorkState.FAILED,
      response: response ?? { error: 'Unknown error' },
    })));
  }

  private async failUnitsOfWork(
    units: UnitOfWork[],
    websiteInstance: UnknownWebsite,
    submission: Submission,
    message: string,
    response: Record<string, unknown> = { error: message },
  ): Promise<void> {
    await this.markUnitsOfWorkAsFailed(units, response);
    await this.notifyPostFailure(websiteInstance, submission, message);
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
      await this.notificationService.create({
        type: 'error',
        title: `Failed to post to ${metadata.displayName}`,
        message,
        tags: ['post-failure', metadata.name],
        data: {
          submissionId: submission.id,
          submissionType: submission.type,
        },
      });
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

  private async updateUnitsOfWorkData(units: UnitOfWork[], data: Record<string, unknown>): Promise<void> {
    await Promise.all(units.map(unit => this.unitOfWorkRepository.update(unit.id, {
      data,
    })));
  }

  private async completePost(): Promise<boolean> {
    try {
      return await this.postRepository.completeIfAllActiveUnitsSettled(
        this.postId,
      );
    } catch (error) {
      this.logger.withError(error).error('Error during post completion');
      return false;
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
