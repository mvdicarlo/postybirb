/* eslint-disable no-param-reassign */
import { EntityDTO, Loaded, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  EntityId,
  FileMetadataFields,
  FileSubmission,
  FileType,
  ImageResizeProps,
  ISubmission,
  ISubmissionFile,
  IWebsiteFormFields,
  IWebsiteOptions,
  IWebsitePostRecord,
  MessageSubmission,
  ModifiedFileDimension,
  PostData,
  PostRecordResumeMode,
  PostRecordState,
  PostResponse,
  SubmissionId,
  SubmissionType,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { chunk } from 'lodash';
import { PostRecord, WebsitePostRecord } from '../../../database/entities';
import { PostyBirbRepository } from '../../../database/repositories/postybirb-repository';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
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

type LoadedPostRecord = Loaded<PostRecord, never>;

// TODO - HEAVILY TEST THIS WITH UNIT AND MANUAL TESTING, ESPECIALLY FILE SUBMISSIONS
// SCENARIOS - ALT FILES, RESIZE, CONVERT, CANCELLATION, BATCHING, SRC INSERTION
@Injectable()
export class PostManagerService {
  private readonly logger = Logger();

  /**
   * The current post being processed.
   * @type {(LoadedPostRecord | null)}
   */
  private currentPost: LoadedPostRecord | null = null;

  /**
   * The current cancel token for the current post.
   * @type {(CancellableToken | null)}
   */
  private cancelToken: CancellableToken = null;

  constructor(
    @InjectRepository(PostRecord)
    private readonly postRepository: PostyBirbRepository<PostRecord>,
    @InjectRepository(WebsitePostRecord)
    private readonly websitePostRecordRepository: PostyBirbRepository<WebsitePostRecord>,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly resizerService: PostFileResizerService,
    private readonly postParserService: PostParsersService,
    private readonly validationService: ValidationService,
    private readonly fileConverterService: FileConverterService,
  ) {}

  private async protectedUpdate(
    entity: LoadedPostRecord,
    data: Partial<EntityDTO<Loaded<LoadedPostRecord, never>>>,
  ) {
    const exists = await this.postRepository.findOne(entity.id);
    if (!exists) {
      throw new Error(`Entity ${entity.id} not found in database`);
    }
    await this.postRepository.update(entity.id, data);
  }

  /**
   * Cancels the current post if it is running and matches the Id.
   * To be used when an external event occurs that requires the current post to be cancelled.
   * i.e. the submission is deleted.
   * @param {SubmissionId} id
   */
  public async cancelIfRunning(id: SubmissionId): Promise<boolean> {
    if (this.currentPost && this.currentPost.parent?.id === id) {
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
  public async startPost(entity: LoadedPostRecord) {
    try {
      if (this.currentPost) return;
      this.cancelToken = new CancellableToken();

      this.logger.withMetadata(entity.toJSON()).info(`Initializing post`);
      this.currentPost = entity;
      await this.protectedUpdate(entity, {
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

  private async finishPost(entity: LoadedPostRecord) {
    this.currentPost = null;
    this.cancelToken = null;

    const allCompleted = entity.children
      .toArray()
      .every((c) => !!c.completedAt);
    const entityInDb = await this.postRepository.findOne(entity.id);
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
    await this.protectedUpdate(entity, {
      state: allCompleted ? PostRecordState.DONE : PostRecordState.FAILED,
      completedAt: new Date(),
    });
  }

  /**
   * Posts to the given website.
   * @param {LoadedPostRecord} entity
   * @param {IWebsitePostRecord} websitePostRecord
   * @param {Website<unknown>} instance
   */
  private async post(
    entity: LoadedPostRecord,
    websitePostRecord: IWebsitePostRecord,
    instance: Website<unknown>,
  ) {
    if (!instance.getLoginState().isLoggedIn) {
      throw new Error('Not logged in');
    }

    const submission = entity.parent;
    try {
      const supportedTypes = instance.getSupportedTypes();
      if (!supportedTypes.includes(submission.type)) {
        throw new Error(
          `Website '${instance.decoratedProps.metadata.displayName}' does not support ${submission.type}`,
        );
      }
      const data = await this.preparePostData(
        submission,
        instance,
        submission.options.find(
          (o) => o.account.id === websitePostRecord.account.id,
        ) as IWebsiteOptions,
      );
      websitePostRecord.postData = data; // Set for later saving
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
      await this.handleFailureResult(websitePostRecord, {
        exception: error,
        additionalInfo: null,
        message: `An unexpected error occurred while posting to ${
          instance.decoratedProps.metadata.displayName ||
          instance.decoratedProps.metadata.name
        }`,
      });
    }
  }

  private async attemptToPost(
    submission: ISubmission,
    websitePostRecord: IWebsitePostRecord,
    instance: UnknownWebsite,
    data: PostData,
  ) {
    this.cancelToken.throwIfCancelled();
    switch (submission.type) {
      case SubmissionType.FILE:
        await this.handleFileSubmission(
          websitePostRecord,
          submission as FileSubmission,
          instance,
          data,
        );
        break;
      case SubmissionType.MESSAGE:
        await this.handleMessageSubmission(
          websitePostRecord,
          submission as MessageSubmission,
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
   * @param {IWebsitePostRecord} websitePostRecord
   * @param {PostResponse} res
   * @param {EntityId[]} [fileIds]
   */
  private async handleSuccessResult(
    websitePostRecord: IWebsitePostRecord,
    res: PostResponse,
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
    websitePostRecord.completedAt = new Date();
    await this.websitePostRecordRepository.persistAndFlush(websitePostRecord);
  }

  /**
   * Handles a failure result from a website post.
   * @param {IWebsitePostRecord} websitePostRecord
   * @param {PostResponse} res
   * @param {EntityId[]} [fileIds]
   */
  private async handleFailureResult(
    websitePostRecord: IWebsitePostRecord,
    res: PostResponse,
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

    await this.websitePostRecordRepository.persistAndFlush(websitePostRecord);
  }

  /**
   * Handles posting a message submission.
   * @param {IWebsitePostRecord} websitePostRecord
   * @param {MessageSubmission} submission
   * @param {Website<unknown>} instance
   * @param {PostData} data
   */
  private async handleMessageSubmission(
    websitePostRecord: IWebsitePostRecord,
    submission: MessageSubmission,
    instance: UnknownWebsite,
    data: PostData,
  ): Promise<void> {
    this.logger.info(`Posting message to ${instance.id}`);
    const result = await (
      instance as unknown as MessageWebsite
    ).onPostMessageSubmission(data, this.cancelToken);
    if (result.exception) {
      await this.handleFailureResult(websitePostRecord, result);
    } else {
      await this.handleSuccessResult(websitePostRecord, result);
    }
  }

  /**
   * Handles posting a file submission.
   * @param {IWebsitePostRecord} websitePostRecord
   * @param {FileSubmission} submission
   * @param {Website<unknown>} instance
   * @param {PostData} data
   */
  private async handleFileSubmission(
    websitePostRecord: IWebsitePostRecord,
    submission: FileSubmission,
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
    const orderedFiles: ISubmissionFile[] = [];
    const metadata = submission.metadata.fileMetadata;
    const files = submission.files
      .getItems()
      .filter(
        // Filter out files that have been marked by the user as ignored for this website.
        (f) => !metadata[f.id]?.ignoredWebsites?.includes(instance.accountId),
      )
      .filter(
        // Only post files that haven't been posted
        // Ensures CONTINUED posts don't post files that have already been posted.
        (f) => websitePostRecord.metadata.postedFiles.indexOf(f.id) === -1,
      )
      .map((f) => wrap(f).toObject());
    submission.metadata.order.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        orderedFiles.push(file as unknown as ISubmissionFile);
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
          batch.map((f) => this.resizeOrModifyFile(f, submission, instance)),
        )
      ).map((f) =>
        f.withMetadata(
          metadata[f.id] ?? {
            ignoredWebsites: [],
            dimensions: null,
          },
        ),
      );

      // Post
      this.cancelToken.throwIfCancelled();
      this.logger.info(`Posting file batch to ${instance.id}`);
      const result = await instance.onPostFileSubmission(
        data,
        processedFiles,
        batchIndex,
        this.cancelToken,
      );

      const batchIds = batch.map((f) => f.id);
      if (result.exception) {
        await this.handleFailureResult(websitePostRecord, result, batchIds);
      } else {
        await this.handleSuccessResult(websitePostRecord, result, batchIds);
        await this.markFilesAsPosted(websitePostRecord, submission, batch);
      }
    }
  }

  private async resizeOrModifyFile(
    file: ISubmissionFile,
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
  ): Promise<PostingFile> {
    const fileMetadata: FileMetadataFields = submission.metadata[file.id];
    let resizeParams: ImageResizeProps | undefined;
    const { fileOptions } = instance.decoratedProps;
    const allowedMimeTypes = fileOptions.acceptedMimeTypes ?? [];
    const fileType = getFileType(file.mimeType);
    if (fileType === FileType.IMAGE) {
      if (
        this.fileConverterService.canConvert(file.mimeType, allowedMimeTypes)
      ) {
        file.file = await this.fileConverterService.convert(
          file.file,
          allowedMimeTypes,
        );
      }
      resizeParams = this.getResizeParameters(submission, instance, file);

      // User defined dimensions
      const userDefinedDimensions =
        // NOTE: Currently the only place dimensions are set are in 'default'.
        // eslint-disable-next-line @typescript-eslint/dot-notation
        fileMetadata?.dimensions['default'] ??
        fileMetadata?.dimensions[instance.accountId]; // TODO - actually have this be a thing to use
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
        file.file = await this.fileConverterService.convert(
          file.altFile,
          allowedMimeTypes,
        );
      }
    }

    return new PostingFile(file.id, file.file, file.thumbnail);
  }

  private async markFilesAsPosted(
    websitePostRecord: IWebsitePostRecord,
    submission: FileSubmission,
    files: ISubmissionFile[],
  ) {
    const fileIds = files.map((f) => f.id);
    websitePostRecord.metadata.nextBatchNumber += 1;
    websitePostRecord.metadata.postedFiles.push(...fileIds);
    await this.websitePostRecordRepository.persistAndFlush(websitePostRecord);
  }

  private getResizeParameters(
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
    file: ISubmissionFile,
  ) {
    const params = instance.calculateImageResize(file);

    const fileParams: ModifiedFileDimension =
      submission.metadata[file.id]?.dimensions;
    if (fileParams) {
      if (fileParams.width) {
        params.width = Math.min(
          file.width,
          fileParams.width,
          params.width ?? Infinity,
        );
      }
      if (fileParams.height) {
        params.height = Math.min(
          file.height,
          fileParams.height,
          params.height ?? Infinity,
        );
      }
    }

    return params;
  }

  /**
   * Gets the post order for the given post record.
   * Additionally filters out any websites that have already been completed.
   * @param {LoadedPostRecord} entity
   * @return {*}  {Array<{ record: IWebsitePostRecord; instance: Website<unknown> }[]>}
   */
  private getPostOrder(
    entity: LoadedPostRecord,
  ): Array<{ record: IWebsitePostRecord; instance: Website<unknown> }[]> {
    const websitePairs = entity.children
      .toArray()
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
  private async createWebsitePostRecords(entity: LoadedPostRecord) {
    // If there are existing website post records, update them if necessary based on mode.
    if (entity.children.length > 0) {
      await this.updateExistingWebsitePostRecords(entity);
    }

    const submission = entity.parent;
    const options: IWebsiteOptions<IWebsiteFormFields>[] =
      submission.options.filter((o) => !o.isDefault);
    // Only care to create children for those that don't already exist.
    const uncreatedOptions = options.filter(
      (o) =>
        !entity.children.toArray().some((c) => c.account.id === o.account.id),
    );
    uncreatedOptions.forEach((w) =>
      entity.children.add(
        this.websitePostRecordRepository.create({
          parent: entity,
          account: w.account,
        }),
      ),
    );
    await this.postRepository.persistAndFlush(entity);
  }

  /**
   * Updates existing website post records based on the resume mode.
   * @param {PostRecord} entity
   * @return {*}
   */
  private async updateExistingWebsitePostRecords(
    entity: LoadedPostRecord,
  ): Promise<void> {
    switch (entity.resumeMode) {
      case PostRecordResumeMode.RESTART:
        entity.children.removeAll();
        await this.postRepository.persistAndFlush(entity);
        break;
      case PostRecordResumeMode.CONTINUE_RETRY:
        await Promise.all(
          entity.children
            .toArray()
            .filter((c) => !c.completedAt)
            .map((c) => {
              // Easiest way to reset the record is to remove it and re-add it
              entity.children.remove(c as unknown as IWebsitePostRecord);
              return this.postRepository.persistAndFlush(entity);
            }),
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
    submission: ISubmission,
    instance: Website<unknown>,
    websiteOptions: IWebsiteOptions,
  ): Promise<PostData> {
    return this.postParserService.parse(submission, instance, websiteOptions);
  }
}
