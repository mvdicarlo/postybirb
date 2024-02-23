/* eslint-disable no-param-reassign */
import { Loaded, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  EntityId,
  FileSubmission,
  FileType,
  ISubmissionFile,
  IWebsitePostRecord,
  MessageSubmission,
  ModifiedFileDimension,
  PostData,
  PostRecordResumeMode,
  PostRecordState,
  PostResponse,
  SubmissionId,
  SubmissionType,
  ValidationResult,
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
import { IsTestEnvironment } from '../utils/test.util';
import { FileWebsite } from '../websites/models/website-modifiers/file-website';
import { MessageWebsite } from '../websites/models/website-modifiers/message-website';
import { Website } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CancellableToken } from './models/cancellable-token';
import { PostingFile } from './models/posting-file';
import { PostParserService } from './parsers/post-parser.service';
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
    private readonly postService: PostService,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly resizerService: PostFileResizerService,
    private readonly postParserService: PostParserService
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
        this.logger.info(`Found next post to post: ${nextToPost.id}`);
        this.startPost(nextToPost);
      }
    }
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
      await this.postRepository.update(entity.id, {
        state: PostRecordState.PROCESSING,
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
    if (this.currentPost) {
      this.currentPost = null;
      this.cancelToken = null;
    }

    this.currentPost = null;
    this.cancelToken = null;

    const allCompleted = entity.children
      .toArray()
      .every((c) => !!c.completedAt);
    await this.postRepository.update(entity.id, {
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
          `Website '${instance.metadata.displayName}' does not support ${submission.type}`
        );
      }
      // TODO - Still need to actually implement data prep
      const data = this.preparePostData(
        submission,
        instance,
        submission.options.find(
          (o) => o.account.id === websitePostRecord.account.id
        )
      );
      // TODO - Are there any other 'generic' validations that can be done here?
      await this.validatePostData(submission.type, data, instance);
      await this.attemptToPost(submission, websitePostRecord, instance, data);
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Error posting to website: ${instance.id}`);
      await this.handleFailureResult(websitePostRecord, {
        exception: error,
        additionalInfo: null,
        message: `An unexpected error occurred while posting to ${
          instance.metadata.displayName || instance.metadata.name
        }`,
      });
    }
  }

  private async attemptToPost(
    submission: Submission,
    websitePostRecord: IWebsitePostRecord,
    instance: Website<unknown>,
    data: PostData<Submission, never>
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
          `Unknown Submission Type: Website '${instance.metadata.displayName}' does not support ${submission.type}`
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
    const fileBatchSize = Math.max(instance.metadata.fileBatchSize ?? 1, 1);
    const orderedFiles: Loaded<ISubmissionFile[]> = [];
    const files = submission.files.getItems().filter(
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
      const processedFiles: PostingFile[] = await Promise.all(
        batch.map((f) => {
          const fileType = getFileType(f.mimeType);
          if (fileType === FileType.IMAGE) {
            const resizeParams = this.getResizeParameters(
              submission,
              filePostableInstance,
              f
            );
            if (resizeParams) {
              // TODO - Figure out what to do about thumbnails. Check if used and process?
              return this.resizerService.resize({
                file: f,
                resize: resizeParams,
              });
            }
          }

          return Promise.resolve(new PostingFile(f));
        })
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
      if (w.instance.metadata.acceptsExternalSources) {
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
    const options: WebsiteOptions<never>[] = submission.options.filter(
      (o) => !o.isDefault
    );
    // Only care to create children for those that don't already exist.
    const uncreatedOptions = options.filter(
      (o) =>
        !entity.children.toArray().some((c) => c.account.id === o.account.id)
    );
    uncreatedOptions.forEach((w) =>
      entity.children.add(
        this.websitePostRecordRepository.create({
          parent: entity,
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
    submission: Submission,
    instance: Website<unknown>,
    websiteOptions: WebsiteOptions<never>
  ): PostData<Submission, never> {
    return this.postParserService.parse(submission, instance, websiteOptions);
  }

  /**
   * Validates the post data for the given submission type.
   * @param {SubmissionType} type
   * @param {PostData<Submission, never>} data
   * @param {Website<unknown>} instance
   */
  private async validatePostData(
    type: SubmissionType,
    data: PostData<Submission, never>,
    instance: Website<unknown>
  ) {
    let result: ValidationResult;
    if (type === SubmissionType.FILE) {
      result = await (
        instance as unknown as FileWebsite<never>
      ).onValidateFileSubmission(
        data as unknown as PostData<FileSubmission, never>
      );
    } else if (type === SubmissionType.MESSAGE) {
      result = await (
        instance as unknown as MessageWebsite<never>
      ).onValidateMessageSubmission(
        data as unknown as PostData<MessageSubmission, never>
      );
    }

    if (result?.errors?.length) {
      throw new BadRequestException('Submission contains validation errors');
    }
  }
}
