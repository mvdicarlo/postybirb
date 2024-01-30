import { Loaded } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  EntityId,
  FileSubmission,
  IWebsitePostRecord,
  MessageSubmission,
  PostData,
  PostRecordResumeMode,
  PostRecordState,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
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
    private readonly websiteRegistry: WebsiteRegistryService
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
        await this.startPost(nextToPost);
      }
    }
  }

  /**
   * Starts a post attempt.
   * @param {PostRecord} entity
   * @return {*}
   */
  public async startPost(entity: LoadedPostRecord) {
    if (this.currentPost) return;
    this.cancelToken = new CancellableToken();

    this.logger.withMetadata(entity.toJSON()).info(`Initializing post`);
    this.currentPost = entity;
    await this.postRepository.update(entity.id, {
      state: PostRecordState.PROCESSING,
    });

    await this.createWebsitePostRecords(entity);
    this.logger.info(`Creating post order`);
    const postOrder = this.getPostOrder(entity);

    this.logger.info(`Posting to websites`);
    // eslint-disable-next-line no-restricted-syntax
    for (const websites of postOrder) {
      this.cancelToken.throwIfCancelled();
      await Promise.allSettled(
        websites.map((w) => this.post(entity, w.record.id, w.instance))
      );
    }
    this.cancelToken = null;
    this.logger.info(`Finished posting to websites`);
  }

  /**
   * Posts to the given website.
   * @param {LoadedPostRecord} entity
   * @param {EntityId} websitePostRecordId
   * @param {Website<unknown>} instance
   */
  private async post(
    entity: LoadedPostRecord,
    websitePostRecordId: EntityId,
    instance: Website<unknown>
  ) {
    const submission = entity.parent;
    try {
      const supportedTypes = instance.getSupportedTypes();
      if (!supportedTypes.includes(submission.type)) {
        throw new BadRequestException(
          `Website '${instance.metadata.displayName}' does not support ${submission.type}`
        );
      }
      const data = this.preparePostData(submission, instance);
      await this.validatePostData(submission.type, data, instance);
      let result: any = null;
      switch (submission.type) {
        case SubmissionType.FILE:
          result = await this.handleFileSubmission(
            submission as unknown as FileSubmission,
            instance
          );
          break;
        case SubmissionType.MESSAGE:
          result = await (
            instance as unknown as MessageWebsite<never>
          ).onPostMessageSubmission(
            data as unknown as PostData<FileSubmission, never>,
            this.cancelToken
          );
          break;
        default:
          throw new BadRequestException(
            `Unknown Submission Type: Website '${instance.metadata.displayName}' does not support ${submission.type}`
          );
      }
      // TODO handle result
    } catch (error) {
      this.logger
        .withError(error)
        .error(`Error posting to website: ${instance.id}`);
      // TODO handle error
    }
  }

  private async handleFileSubmission(
    submission: FileSubmission,
    instance: Website<unknown>
  ) {
    const fileBatchSize = Math.max(instance.metadata.fileBatchSize ?? 1, 1);
    const orderedFiles = [];
    const files = submission.files.toArray();
    submission.metadata.order.forEach((fileId) => {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        orderedFiles.push(file);
      }
    });

    const batches = chunk(orderedFiles, fileBatchSize);
    // TODO - Load files into memory
    // TODO - Resize files (if necessary) by file dimensions
    // TODO - Resize files (if necessary) by file size limits

    result = await (
      instance as unknown as FileWebsite<never>
    ).onPostFileSubmission(
      data as unknown as PostData<FileSubmission, never>,
      this.cancelToken
    );

    return null;
  }

  /**
   * Gets the post order for the given post record.
   * @param {LoadedPostRecord} entity
   * @return {*}  {Array<{ record: IWebsitePostRecord; instance: Website<unknown> }[]>}
   */
  private getPostOrder(
    entity: LoadedPostRecord
  ): Array<{ record: IWebsitePostRecord; instance: Website<unknown> }[]> {
    const websitePairs = entity.children.toArray().map((c) => ({
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
   * @memberof PostManagerService
   */
  private async createWebsitePostRecords(entity: LoadedPostRecord) {
    // If there are existing website post records, update them if necessary based on mode.
    if (entity.children.length > 0) {
      await this.updateExistingWebsitePostRecords(entity);
    }

    const submission = entity.parent;
    // eslint-disable-next-line prefer-destructuring
    const options: WebsiteOptions<never>[] = submission.options;
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
        // TODO verify this actually clears the array
        break;
      case PostRecordResumeMode.RETRY:
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
   * @return {*}  {PostData<Submission, never>}
   */
  private preparePostData(
    submission: Submission,
    instance: Website<unknown>
  ): PostData<Submission, never> {
    // TODO parser logic
    return null;
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
