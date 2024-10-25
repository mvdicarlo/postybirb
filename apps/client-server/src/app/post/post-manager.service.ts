/* eslint-disable no-param-reassign */
import { EntityDTO, Loaded, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  EntityId,
  FileMetadataFields,
  FileSubmission,
  FileType,
  ImageResizeProps,
  IPostRecord,
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
import {
  PostRecord,
  Submission,
  WebsiteOptions,
  WebsitePostRecord,
} from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { IsTestEnvironment } from '../utils/test.util';
import { ValidationService } from '../validation/validation.service';
import { FileWebsite } from '../websites/models/website-modifiers/file-website';
import { MessageWebsite } from '../websites/models/website-modifiers/message-website';
import { Website } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CancellableToken } from './models/cancellable-token';
import { PostingFile } from './models/posting-file';
import { PostFileResizerService } from './post-file-resizer.service';
import { PostService } from './post.service';

type LoadedPostRecord = Loaded<PostRecord, never>;

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
    @Inject(forwardRef(() => PostService))
    private readonly postService: PostService,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly resizerService: PostFileResizerService,
    private readonly postParserService: PostParsersService,
    private readonly validationService: ValidationService
  ) {
    setTimeout(() => this.check(), 60_000);
  }

  /**
   * Checks for any posts that need to be posted.
   */
  private async check() {
    if (!IsTestEnvironment()) {
      const nextToPost = await this.postService.getNext();
      if (nextToPost && this.currentPost?.id !== nextToPost.id) {
        this.logger.info(`Found next to post: ${nextToPost.id}`);
        this.startPost(nextToPost);
      }
    }
  }

  private async protectedUpdate(
    entity: LoadedPostRecord,
    data: Partial<EntityDTO<Loaded<LoadedPostRecord, never>>>
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
  public async cancelIfRunning(id: SubmissionId) {
    if (this.currentPost) {
      if (!this.currentPost.parent) {
        const loaded = await wrap(this.currentPost).init(true, ['parent']);
        if (loaded.parent.id === id) {
          this.logger.info(`Cancelling current post`);
          this.cancelToken.cancel();
        }
      }
    }
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

      // Ensure parent (submission) is loaded
      if (!entity.parent) {
        entity = await wrap(entity).init(true, ['parent']);
      }

      await this.createWebsitePostRecords(entity);

      // Posts order occurs in batched groups
      // Standard websites first, then websites that accept external source urls
      this.logger.info(`Creating post order`);
      const postOrderGroups = this.getPostOrder(entity);

      this.logger.info(`Posting to websites`);
      // eslint-disable-next-line no-restricted-syntax
      for (const websites of postOrderGroups) {
        this.cancelToken.throwIfCancelled();
        await Promise.allSettled(
          websites.map((w) => this.post(entity, w.record, w.instance))
        );
      }
      await this.finishPost(entity);
      this.logger.info(`Finished posting to websites`);
    } catch (error) {
      this.logger.withError(error).error(`Error posting`);
      await this.finishPost(entity);
      throw error;
    } finally {
      this.check();
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
        `Entity ${entity.id} not found in database. It may have been deleted while posting.`
      );
      return;
    }
    if (!entityInDb) {
      this.logger.warn(
        `Entity ${entity.id} not found in database. It may have been deleted while posting. Updating anyways due to all websites being completed.`
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
    instance: Website<unknown>
  ) {
    // TODO - Need to consider cancellation scenarios - i.e. if the submission is deleted, or an update occurs
    if (!instance.getLoginState().isLoggedIn) {
      throw new Error('Not logged in');
    }

    const submission = entity.parent;
    try {
      const supportedTypes = instance.getSupportedTypes();
      if (!supportedTypes.includes(submission.type)) {
        throw new Error(
          `Website '${instance.decoratedProps.metadata.displayName}' does not support ${submission.type}`
        );
      }
      const data = await this.preparePostData(
        submission as unknown as ISubmission,
        instance,
        submission.options.find(
          (o) => o.account.id === websitePostRecord.account.id
        ) as unknown as IWebsiteOptions
      );
      const validationResult = await this.validationService.validateSubmission(
        submission
      );
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
    instance: Website<unknown>,
    data: PostData<ISubmission, IWebsiteFormFields>
  ) {
    this.cancelToken.throwIfCancelled();
    switch (submission.type) {
      case SubmissionType.FILE:
        await this.handleFileSubmission(
          websitePostRecord,
          submission as unknown as FileSubmission,
          instance,
          data as unknown as PostData<FileSubmission, never>
        );
        break;
      case SubmissionType.MESSAGE:
        await this.handleMessageSubmission(
          websitePostRecord,
          submission as unknown as MessageSubmission,
          instance,
          data as unknown as PostData<MessageSubmission, never>
        );
        break;
      default:
        throw new Error(
          `Unknown Submission Type: Website '${instance.decoratedProps.metadata.displayName}' does not support ${submission.type}`
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
    fileIds?: EntityId[]
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
    fileIds?: EntityId[]
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
   * @param {PostData<MessageSubmission, never>} data
   */
  private async handleMessageSubmission(
    websitePostRecord: IWebsitePostRecord,
    submission: MessageSubmission,
    instance: Website<unknown>,
    data: PostData<MessageSubmission, never>
  ): Promise<void> {
    this.logger.info(`Posting message to ${instance.id}`);
    const result = await (
      instance as unknown as MessageWebsite<never>
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
   * @param {PostData<FileSubmission, never>} data
   */
  private async handleFileSubmission(
    websitePostRecord: IWebsitePostRecord,
    submission: FileSubmission,
    instance: Website<unknown>,
    data: PostData<FileSubmission, never>
  ): Promise<void> {
    // Order files based on submission order
    const fileBatchSize = Math.max(
      instance.decoratedProps.fileOptions.fileBatchSize ?? 1,
      1
    );
    const orderedFiles: Loaded<ISubmissionFile[]> = [];
    const metadata = submission.metadata.fileMetadata;
    const files = submission.files
      .getItems()
      .filter(
        // Filter out files that have been marked by the user as ignored for this website.
        (f) => !metadata[f.id]?.ignoredWebsites?.includes(instance.accountId)
      )
      .filter(
        // Only post files that haven't been posted
        // Ensures CONTINUED posts don't post files that have already been posted.
        (f) => websitePostRecord.metadata.postedFiles.indexOf(f.id) === -1
      );
    submission.metadata.order.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        orderedFiles.push(file);
      }
    });

    // Split files into batches based on instance file batch size
    const batches = chunk(orderedFiles, fileBatchSize);
    const filePostableInstance = instance as unknown as FileWebsite<never>;
    // eslint-disable-next-line no-restricted-syntax
    for (const batch of batches) {
      this.cancelToken.throwIfCancelled();

      // Resize files if necessary
      const processedFiles: PostingFile[] = (
        await Promise.all(
          batch.map((f) => {
            const fileMetadata: FileMetadataFields = submission.metadata[f.id];
            let resizeParams: ImageResizeProps | undefined;
            const fileType = getFileType(f.mimeType);
            if (fileType === FileType.IMAGE) {
              resizeParams = this.getResizeParameters(
                submission,
                filePostableInstance,
                f
              );

              // User defined dimensions
              const userDefinedDimensions =
                // NOTE: Currently the only place dimensions are set are in 'default'.
                // eslint-disable-next-line @typescript-eslint/dot-notation
                fileMetadata?.dimensions['default'] ??
                fileMetadata?.dimensions[instance.accountId];
              if (userDefinedDimensions) {
                if (
                  userDefinedDimensions.width &&
                  userDefinedDimensions.height
                ) {
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
            }

            // TODO - Website defined dimensions (i.e. HF)

            return this.resizerService.resize({
              file: f,
              resize: resizeParams,
            });
          })
        )
      ).map((f) =>
        f.withMetadata(
          metadata[f.id] ?? {
            ignoredWebsites: [],
            dimensions: null,
          }
        )
      );

      // Post
      this.cancelToken.throwIfCancelled();
      this.logger.info(`Posting file batch to ${instance.id}`);
      // TODO - Do something with nextBatchNumber
      const result = await (
        instance as unknown as FileWebsite<never>
      ).onPostFileSubmission(data, processedFiles, this.cancelToken);

      const batchIds = batch.map((f) => f.id);
      if (result.exception) {
        await this.handleFailureResult(websitePostRecord, result, batchIds);
      } else {
        await this.handleSuccessResult(websitePostRecord, result, batchIds);
        await this.markFilesAsPosted(websitePostRecord, submission, batch);
      }
    }
  }

  private async markFilesAsPosted(
    websitePostRecord: IWebsitePostRecord,
    submission: FileSubmission,
    files: ISubmissionFile[]
  ) {
    const fileIds = files.map((f) => f.id);
    websitePostRecord.metadata.nextBatchNumber += 1;
    websitePostRecord.metadata.postedFiles.push(...fileIds);
    await this.websitePostRecordRepository.persistAndFlush(websitePostRecord);
  }

  private getResizeParameters(
    submission: FileSubmission,
    instance: FileWebsite<never>,
    file: ISubmissionFile
  ) {
    const params = instance.calculateImageResize(file);

    const fileParams: ModifiedFileDimension =
      submission.metadata[file.id]?.dimensions;
    if (fileParams) {
      if (fileParams.width) {
        params.width = Math.min(
          file.width,
          fileParams.width,
          params.width ?? Infinity
        );
      }
      if (fileParams.height) {
        params.height = Math.min(
          file.height,
          fileParams.height,
          params.height ?? Infinity
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
    entity: LoadedPostRecord
  ): Array<{ record: IWebsitePostRecord; instance: Website<unknown> }[]> {
    const websitePairs = entity.children
      .toArray()
      .filter((c) => !!c.completedAt) // Only post to those that haven't been completed
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
        !entity.children.toArray().some((c) => c.account.id === o.account.id)
    );
    uncreatedOptions.forEach((w) =>
      entity.children.add(
        this.websitePostRecordRepository.create({
          parent: entity as unknown as IPostRecord,
          account: w.account,
        })
      )
    );
    await this.postRepository.persistAndFlush(entity);
  }

  /**
   * Updates existing website post records based on the resume mode.
   * @param {PostRecord} entity
   * @return {*}
   */
  private async updateExistingWebsitePostRecords(
    entity: LoadedPostRecord
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
            })
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
   * @return {*}  {PostData<Submission, never>}
   */
  private preparePostData(
    submission: ISubmission,
    instance: Website<unknown>,
    websiteOptions: IWebsiteOptions
  ): Promise<PostData<ISubmission, IWebsiteFormFields>> {
    return this.postParserService.parse(submission, instance, websiteOptions);
  }
}
