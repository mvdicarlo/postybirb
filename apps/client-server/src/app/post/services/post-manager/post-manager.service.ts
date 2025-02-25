/* eslint-disable no-param-reassign */
import { Injectable, Optional } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  EntityId,
  FileMetadataFields,
  FileSubmission,
  FileSubmissionMetadata,
  FileType,
  ImageResizeProps,
  IPostResponse,
  ModifiedFileDimension,
  PostData,
  PostRecordResumeMode,
  PostRecordState,
  PostResponse,
  ScheduleType,
  SubmissionId,
  SubmissionType,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { chunk } from 'lodash';
import {
  FileBuffer,
  PostRecord,
  Submission,
  SubmissionFile,
  WebsiteOptions,
  WebsitePostRecord,
} from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { SubmissionService } from '../../../submission/services/submission.service';
import { ValidationService } from '../../../validation/validation.service';
import { getSupportedFileSize } from '../../../websites/decorators/supports-files.decorator';
import {
  ImplementedFileWebsite,
  isFileWebsite,
} from '../../../websites/models/website-modifiers/file-website';
import { MessageWebsite } from '../../../websites/models/website-modifiers/message-website';
import { UnknownWebsite, Website } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { CancellableToken } from '../../models/cancellable-token';
import { PostingFile } from '../../models/posting-file';
import { PostFileResizerService } from '../post-file-resizer/post-file-resizer.service';

@Injectable()
export class PostManagerService {
  private readonly logger = Logger(this.constructor.name);

  /**
   * The current post being processed.
   * @type {(LoadedPostRecord | null)}
   */
  private currentPost: PostRecord | null = null;

  /**
   * The current cancel token for the current post.
   * @type {(CancellableToken | null)}
   */
  private cancelToken: CancellableToken = null;

  private readonly postRepository: PostyBirbDatabase<'PostRecordSchema'>;

  private readonly websitePostRecordRepository: PostyBirbDatabase<'WebsitePostRecordSchema'>;

  constructor(
    @Optional()
    postRepository: PostyBirbDatabase<'PostRecordSchema'>,
    @Optional()
    websitePostRecordRepository: PostyBirbDatabase<'WebsitePostRecordSchema'>,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly resizerService: PostFileResizerService,
    private readonly postParserService: PostParsersService,
    private readonly validationService: ValidationService,
    private readonly fileConverterService: FileConverterService,
    private readonly submissionService: SubmissionService,
  ) {
    this.postRepository =
      postRepository ?? new PostyBirbDatabase('PostRecordSchema');
    this.websitePostRecordRepository =
      websitePostRecordRepository ??
      new PostyBirbDatabase('WebsitePostRecordSchema', {
        account: true,
      });
  }

  /**
   * Cancels the current post if it is running and matches the Id.
   * To be used when an external event occurs that requires the current post to be cancelled.
   * i.e. the submission is deleted.
   * @param {SubmissionId} id
   */
  public async cancelIfRunning(id: SubmissionId): Promise<boolean> {
    if (this.currentPost && this.currentPost.submissionId === id) {
      this.logger.info(`Cancelling current post`);
      this.cancelToken.cancel();
      return true;
    }
    return false;
  }

  public isPosting(): boolean {
    return !!this.currentPost;
  }

  /**
   * Starts a post attempt.
   * @param {PostRecord} entity
   */
  public async startPost(entity: PostRecord) {
    try {
      if (this.currentPost) return;
      this.cancelToken = new CancellableToken();

      this.logger.withMetadata(entity.toDTO()).info(`Initializing post`);
      this.currentPost = entity;
      await this.postRepository.update(entity.id, {
        state: PostRecordState.RUNNING,
      });

      await this.createWebsitePostRecords(entity);

      // Posts order occurs in batched groups
      // Standard websites first, then websites that accept external source urls
      this.logger.info(`Creating post order`);
      const postOrderGroups = this.getPostOrder(entity);

      this.logger.info(`Posting to websites`);
      for (const websites of postOrderGroups) {
        this.cancelToken.throwIfCancelled();
        await Promise.allSettled(
          websites.map((w) => this.post(entity, w.record, w.instance)),
        );
      }
      this.logger.info(`Finished posting to websites`);
    } catch (error) {
      this.logger.withError(error).error(`Error posting`);
    } finally {
      await this.finishPost(entity);
    }
  }

  private async finishPost(entity: PostRecord) {
    this.currentPost = null;
    this.cancelToken = null;

    const allCompleted = entity.children.every((c) => !!c.completedAt);
    const entityInDb = await this.postRepository.findById(entity.id);
    if (!entityInDb && !allCompleted) {
      this.logger.error(
        `Entity ${entity.id} not found in database. It may have been deleted while posting.`,
      );
      return;
    }
    if (!entityInDb) {
      this.logger.warn(
        `Entity ${entity.id} not found in database. It may have been deleted while posting. Updating anyways due to all websites being completed.`,
      );
    }
    await this.postRepository.update(entity.id, {
      completedAt: new Date().toISOString(),
      state: allCompleted ? PostRecordState.DONE : PostRecordState.FAILED,
    });
    if (
      allCompleted &&
      entity.submission.schedule.scheduleType !== ScheduleType.RECURRING
    ) {
      await this.submissionService.update(entity.submissionId, {
        isArchived: true,
      });
    }
  }

  /**
   * Posts to the given website.
   * @param {PostRecord} entity
   * @param {WebsitePostRecord} websitePostRecord
   * @param {Website<unknown>} instance
   */
  private async post(
    entity: PostRecord,
    websitePostRecord: WebsitePostRecord,
    instance: Website<unknown>,
  ) {
    if (!instance.getLoginState().isLoggedIn) {
      throw new Error('Not logged in');
    }

    const { submission } = entity;
    try {
      const supportedTypes = instance.getSupportedTypes();
      if (!supportedTypes.includes(submission.type)) {
        throw new Error(
          `Website '${instance.decoratedProps.metadata.displayName}' does not support ${submission.type}`,
        );
      }

      const option = submission.options.find(
        (o) => o.accountId === websitePostRecord.accountId,
      );

      this.logger.info('Preparing post data');
      const data = await this.preparePostData(submission, instance, option);
      this.logger.withMetadata(data).info('Post data prepared');
      websitePostRecord.postData = {
        parsedOptions: data.options,
        websiteOptions: [submission.options.find((o) => o.isDefault), option],
      }; // Set for later saving
      this.logger.info('Validating submission');
      const validationResult =
        await this.validationService.validateSubmission(submission);
      if (validationResult.some((v) => v.errors.length > 0)) {
        throw new Error('Submission contains validation errors');
      }
      await this.attemptToPost(submission, websitePostRecord, instance, data);
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Error posting to website: ${instance.id}`);
      const errorResponse =
        error instanceof PostResponse
          ? error
          : PostResponse.fromWebsite(instance)
              .withException(error)
              .withMessage(
                `An unexpected error occurred while posting to ${
                  instance.decoratedProps.metadata.displayName ||
                  instance.decoratedProps.metadata.name
                }`,
              );
      await this.handleFailureResult(websitePostRecord, errorResponse);
    }
  }

  private async attemptToPost(
    submission: Submission,
    websitePostRecord: WebsitePostRecord,
    instance: UnknownWebsite,
    data: PostData,
  ) {
    this.cancelToken.throwIfCancelled();
    this.logger.info(`Attempting to post to ${instance.id}`);
    switch (submission.type) {
      case SubmissionType.FILE:
        await this.handleFileSubmission(
          websitePostRecord,
          submission as Submission<FileSubmissionMetadata>,
          instance,
          data,
        );
        break;
      case SubmissionType.MESSAGE:
        await this.handleMessageSubmission(
          websitePostRecord,
          submission,
          instance,
          data,
        );
        break;
      default:
        throw new Error(
          `Unknown Submission Type: Website '${instance.decoratedProps.metadata.displayName}' does not support ${submission.type}`,
        );
    }
  }

  /**
   * Handles a successful result from a website post.
   * Marks the post as completed and updates the metadata.
   * @param {WebsitePostRecord} websitePostRecord
   * @param {IPostResponse} res
   * @param {EntityId[]} [fileIds]
   */
  private async handleSuccessResult(
    websitePostRecord: WebsitePostRecord,
    res: IPostResponse,
    fileIds?: EntityId[],
  ): Promise<void> {
    if (fileIds?.length) {
      fileIds.forEach((id) => {
        websitePostRecord.metadata.sourceMap[id] = res.sourceUrl ?? null;
        websitePostRecord.metadata.postedFiles.push(id);
      });
    } else {
      // Only really applies to message submissions
      websitePostRecord.metadata.source = res.sourceUrl ?? null;
    }
    websitePostRecord.completedAt = new Date().toISOString();
    await this.websitePostRecordRepository.update(websitePostRecord.id, {
      completedAt: websitePostRecord.completedAt,
      metadata: websitePostRecord.metadata,
      postResponse: websitePostRecord.postResponse,
      postData: websitePostRecord.postData,
    });
  }

  /**
   * Handles a failure result from a website post.
   * @param {WebsitePostRecord} websitePostRecord
   * @param {IPostResponse} res
   * @param {EntityId[]} [fileIds]
   */
  private async handleFailureResult(
    websitePostRecord: WebsitePostRecord,
    res: IPostResponse,
    fileIds?: EntityId[],
  ): Promise<void> {
    if (res.exception) {
      websitePostRecord.errors = websitePostRecord.errors ?? [];
      websitePostRecord.errors.push({
        files: fileIds,
        message: res.message ?? res.exception.message,
        stack: res.exception.stack,
        stage: res.stage ?? 'unknown',
        additionalInfo: res.additionalInfo,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.withMetadata(res).error(`Failed to post to ${res.instanceId}`);
    await this.websitePostRecordRepository.update(websitePostRecord.id, {
      errors: websitePostRecord.errors,
      metadata: websitePostRecord.metadata,
      postResponse: websitePostRecord.postResponse,
      postData: websitePostRecord.postData,
    });
  }

  /**
   * Handles posting a message submission.
   * @param {WebsitePostRecord} websitePostRecord
   * @param {Submission} submission
   * @param {Website<unknown>} instance
   * @param {PostData} data
   */
  private async handleMessageSubmission(
    websitePostRecord: WebsitePostRecord,
    submission: Submission,
    instance: UnknownWebsite,
    data: PostData,
  ): Promise<void> {
    this.logger.info(`Posting message to ${instance.id}`);
    const result = await (
      instance as unknown as MessageWebsite
    ).onPostMessageSubmission(data, this.cancelToken);
    websitePostRecord.postResponse.push(result);
    if (result.exception) {
      await this.handleFailureResult(websitePostRecord, result);
    } else {
      await this.handleSuccessResult(websitePostRecord, result);
    }
  }

  /**
   * Handles posting a file submission.
   * @param {WebsitePostRecord} websitePostRecord
   * @param {Submission<FileSubmissionMetadata>} submission
   * @param {Website<unknown>} instance
   * @param {PostData} data
   */
  private async handleFileSubmission(
    websitePostRecord: WebsitePostRecord,
    submission: Submission<FileSubmissionMetadata>,
    instance: UnknownWebsite,
    data: PostData,
  ): Promise<void> {
    if (!isFileWebsite(instance)) {
      throw new Error(
        `Website '${instance.decoratedProps.metadata.displayName}' does not support file submissions`,
      );
    }
    // Order files based on submission order
    const fileBatchSize = Math.max(
      instance.decoratedProps.fileOptions.fileBatchSize ?? 1,
      1,
    );
    const orderedFiles: SubmissionFile[] = [];
    const metadata = submission.metadata.fileMetadata;
    const files = submission.files
      .filter(
        // Filter out files that have been marked by the user as ignored for this website.
        (f) => !metadata[f.id]?.ignoredWebsites?.includes(instance.accountId),
      )
      .filter(
        // Only post files that haven't been posted
        // Ensures CONTINUED posts don't post files that have already been posted.
        (f) => websitePostRecord.metadata.postedFiles.indexOf(f.id) === -1,
      );
    submission.metadata.order.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        orderedFiles.push(file);
      }
    });

    // Split files into batches based on instance file batch size
    const batches = chunk(orderedFiles, fileBatchSize);
    let batchIndex = 0;
    for (const batch of batches) {
      batchIndex += 1;
      this.cancelToken.throwIfCancelled();

      // Resize files if necessary
      const processedFiles: PostingFile[] = (
        await Promise.all(
          batch.map((submissionFile) =>
            this.resizeOrModifyFile(submissionFile, submission, instance),
          ),
        )
      ).map((f) =>
        f.withMetadata(
          metadata[f.id] ?? {
            ignoredWebsites: [],
            dimensions: null,
          },
        ),
      );

      // Verify files are supported by the website after all processing
      // and potential conversions are completed.
      // This could also be due to poorly thought out defined website options causing conflicts.
      this.verifyPostingFiles(instance, processedFiles);

      // Post
      this.cancelToken.throwIfCancelled();
      const fileIds = batch.map((f) => f.id);
      this.logger
        .withMetadata({
          batchIndex,
          totalBatches: batches.length,
          totalFiles: files.length,
          totalFilesInBatch: batch.length,
          fileIds,
        })
        .info(`Posting file batch to ${instance.id}`);
      const result = await instance.onPostFileSubmission(
        data,
        processedFiles,
        batchIndex,
        this.cancelToken,
      );

      if (result.exception) {
        await this.handleFailureResult(websitePostRecord, result, fileIds);
        // Behavior is to stop posting if a batch fails.
        return;
      }

      await this.handleSuccessResult(websitePostRecord, result, fileIds);
      await this.markFilesAsPosted(websitePostRecord, submission, batch);
      websitePostRecord.postResponse.push(result);
      this.logger
        .withMetadata(result)
        .info(`File batch posted to ${instance.id}`);
    }
  }

  private verifyPostingFiles(
    websiteInstance: UnknownWebsite,
    postingFiles: PostingFile[],
  ): void {
    const acceptedMimeTypes =
      websiteInstance.decoratedProps.fileOptions.acceptedMimeTypes ?? [];
    if (acceptedMimeTypes.length === 0) return;
    postingFiles.forEach((f) => {
      if (!acceptedMimeTypes.includes(f.mimeType)) {
        throw new Error(
          `Website '${websiteInstance.decoratedProps.metadata.displayName}' does not support the file type ${f.mimeType} and attempts convert it did not resolve the issue`,
        );
      }
    });
  }

  private async resizeOrModifyFile(
    file: SubmissionFile,
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
  ): Promise<PostingFile> {
    if (!file.file) {
      await file.load();
    }
    const fileMetadata: FileMetadataFields = submission.metadata[file.id];
    let resizeParams: ImageResizeProps | undefined;
    const { fileOptions } = instance.decoratedProps;
    const allowedMimeTypes = fileOptions.acceptedMimeTypes ?? [];
    const fileType = getFileType(file.mimeType);
    if (fileType === FileType.IMAGE) {
      if (
        await this.fileConverterService.canConvert(
          file.mimeType,
          allowedMimeTypes,
        )
      ) {
        file.file = new FileBuffer(
          await this.fileConverterService.convert(file.file, allowedMimeTypes),
        );
      }
      resizeParams = this.getResizeParameters(submission, instance, file);

      // User defined dimensions
      const userDefinedDimensions =
        // NOTE: Currently the only place dimensions are set are in 'default'.
        // eslint-disable-next-line @typescript-eslint/dot-notation
        fileMetadata?.dimensions['default'] ??
        fileMetadata?.dimensions[instance.accountId];
      if (userDefinedDimensions) {
        if (userDefinedDimensions.width && userDefinedDimensions.height) {
          resizeParams = resizeParams ?? {};
          if (
            userDefinedDimensions.width > resizeParams.width &&
            userDefinedDimensions.height > resizeParams.height
          ) {
            resizeParams = {
              ...resizeParams,
              width: userDefinedDimensions.width,
              height: userDefinedDimensions.height,
            };
          }
        }
      }

      // We pass to resize even if no resize parameters are set
      // as it handles the bundling to PostingFile.
      // Not exactly clean, but this can be refactored later.
      return this.resizerService.resize({
        file,
        resize: resizeParams,
      });
    }

    if (
      fileType === FileType.TEXT &&
      file.hasAltFile &&
      !allowedMimeTypes.includes(file.mimeType)
    ) {
      // Use alt file if it exists and is a text file
      if (
        this.fileConverterService.canConvert(
          file.altFile.mimeType,
          allowedMimeTypes,
        )
      ) {
        file.file = new FileBuffer(
          await this.fileConverterService.convert(
            file.altFile,
            allowedMimeTypes,
          ),
        );
      }
    }

    return new PostingFile(file.id, file.file, file.thumbnail);
  }

  private async markFilesAsPosted(
    websitePostRecord: WebsitePostRecord,
    submission: FileSubmission,
    files: SubmissionFile[],
  ) {
    const fileIds = files.map((f) => f.id);
    websitePostRecord.metadata.nextBatchNumber += 1;
    websitePostRecord.metadata.postedFiles.push(...fileIds);
    await this.websitePostRecordRepository.update(websitePostRecord.id, {
      metadata: websitePostRecord.metadata,
    });
  }

  private getResizeParameters(
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
    file: SubmissionFile,
  ) {
    let resizeParams = instance.calculateImageResize(file);
    const fileParams: ModifiedFileDimension =
      submission.metadata[file.id]?.dimensions;
    if (fileParams) {
      if (fileParams.width) {
        if (!resizeParams) {
          resizeParams = {};
        }
        resizeParams.width = Math.min(
          file.width,
          fileParams.width,
          resizeParams.width ?? Infinity,
        );
      }
      if (fileParams.height) {
        if (!resizeParams) {
          resizeParams = {};
        }
        resizeParams.height = Math.min(
          file.height,
          fileParams.height,
          resizeParams.height ?? Infinity,
        );
      }
    }

    if (!resizeParams?.maxBytes) {
      // Fall back to defined max bytes
      const supportedFileSize = getSupportedFileSize(instance, file);
      if (supportedFileSize && file.size > supportedFileSize) {
        if (!resizeParams) {
          resizeParams = {};
        }
        resizeParams.maxBytes = supportedFileSize;
      }
    }

    return resizeParams;
  }

  /**
   * Gets the post order for the given post record.
   * Additionally filters out any websites that have already been completed.
   * @param {PostRecord} entity
   * @return {*}  {Array<{ record: WebsitePostRecord; instance: Website<unknown> }[]>}
   */
  private getPostOrder(
    entity: PostRecord,
  ): Array<{ record: WebsitePostRecord; instance: Website<unknown> }[]> {
    const websitePairs = entity.children
      .filter((c) => !c.completedAt) // Only post to those that haven't been completed
      .map((c) => ({
        record: c,
        instance: this.websiteRegistry.findInstance(c.account),
      }));

    const standardWebsites = []; // Post first
    const externalSourceWebsites = []; // Post last
    websitePairs.forEach((w) => {
      if (w.instance.decoratedProps.fileOptions?.acceptsExternalSourceUrls) {
        externalSourceWebsites.push(w);
      } else {
        standardWebsites.push(w);
      }
    });

    return [standardWebsites, externalSourceWebsites];
  }

  /**
   * Creates child website post records for the given post record.
   * Will update existing website post records if they exist based
   * on the resume mode.
   * @param {PostRecord} entity
   */
  private async createWebsitePostRecords(entity: PostRecord) {
    // If there are existing website post records, update them if necessary based on mode.
    if (entity.children.length > 0) {
      await this.updateExistingWebsitePostRecords(entity);
    }

    const { submission } = entity;
    const options = submission.options.filter((o) => !o.isDefault);
    // Only care to create children for those that don't already exist.
    const uncreatedOptions = options.filter(
      (o) => !entity.children.some((c) => c.account.id === o.accountId),
    );
    const children = uncreatedOptions.map(
      (w) =>
        new WebsitePostRecord({
          postRecordId: entity.id,
          accountId: w.accountId,
          account: w.account,
          metadata: {
            postedFiles: [],
            sourceMap: {},
            nextBatchNumber: 1,
          },
          errors: [],
        }),
    );
    entity.children.push(
      ...(await this.websitePostRecordRepository.insert(children)),
    );
  }

  /**
   * Updates existing website post records based on the resume mode.
   * @param {PostRecord} entity
   * @return {*}
   */
  private async updateExistingWebsitePostRecords(
    entity: PostRecord,
  ): Promise<void> {
    switch (entity.resumeMode) {
      case PostRecordResumeMode.RESTART:
        await this.websitePostRecordRepository.deleteById(
          entity.children.map((c) => c.id),
        );
        entity.children = [];
        break;
      case PostRecordResumeMode.CONTINUE_RETRY:
        await Promise.all(
          entity.children
            .filter((c) => !c.completedAt)
            .map((c) =>
              // Easiest way to reset the record is to remove it and re-add it
              this.websitePostRecordRepository.deleteById([c.id]),
            ),
        );
        break;
      case PostRecordResumeMode.CONTINUE:
      default:
      // Nothing to do
    }
  }

  /**
   * Prepares the post data for the given submission type.
   * Parses descriptions, tags, etc.
   * @param {Submission} submission
   * @param {Website<unknown>} instance
   * @param {WebsiteOptions<never>} websiteOptions
   * @return {*}  {PostData}
   */
  private preparePostData(
    submission: Submission,
    instance: Website<unknown>,
    websiteOptions: WebsiteOptions,
  ): Promise<PostData> {
    return this.postParserService.parse(submission, instance, websiteOptions);
  }
}
