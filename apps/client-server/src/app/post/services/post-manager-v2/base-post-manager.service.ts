import {
  Logger,
  trackEvent,
  trackException,
  trackMetric,
} from '@postybirb/logger';
import {
  AccountId,
  EntityId,
  PostData,
  PostEventType,
  PostRecordState,
  PostResponse,
  SubmissionType,
} from '@postybirb/types';
import {
  PostRecord,
  Submission,
  WebsiteOptions,
} from '../../../drizzle/models';
import { PostyBirbDatabase } from '../../../drizzle/postybirb-database/postybirb-database';
import { NotificationsService } from '../../../notifications/notifications.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
import { UnknownWebsite, Website } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { CancellableToken } from '../../models/cancellable-token';
import { CancellationError } from '../../models/cancellation-error';
import { PostEventRepository, ResumeContext } from '../post-record-factory';

/**
 * Website info for posting order.
 */
interface WebsiteInfo {
  accountId: AccountId;
  instance: Website<unknown>;
}

/**
 * Abstract base class for PostManager implementations.
 * Handles common posting logic and event emission.
 * @abstract
 * @class BasePostManager
 */
export abstract class BasePostManager {
  protected readonly logger = Logger(this.constructor.name);

  protected readonly lastTimePostedToWebsite: Record<AccountId, Date> = {};

  /**
   * The current post being processed.
   */
  protected currentPost: PostRecord | null = null;

  /**
   * The current cancel token for the current post.
   */
  protected cancelToken: CancellableToken | null = null;

  /**
   * Resume context from prior attempts.
   */
  protected resumeContext: ResumeContext | null = null;

  protected readonly postRepository: PostyBirbDatabase<'PostRecordSchema'>;

  constructor(
    protected readonly postEventRepository: PostEventRepository,
    protected readonly websiteRegistry: WebsiteRegistryService,
    protected readonly postParserService: PostParsersService,
    protected readonly validationService: ValidationService,
    protected readonly notificationService: NotificationsService,
  ) {
    this.postRepository = new PostyBirbDatabase('PostRecordSchema');
  }

  /**
   * Get the submission type this manager handles.
   * @abstract
   * @returns {SubmissionType} The submission type
   */
  abstract getSupportedType(): SubmissionType;

  /**
   * Cancels the current post if it is running and matches the Id.
   * @param {EntityId} submissionId - The submission ID to check
   * @returns {Promise<boolean>} True if the post was cancelled
   */
  public async cancelIfRunning(submissionId: EntityId): Promise<boolean> {
    if (this.currentPost && this.currentPost.submissionId === submissionId) {
      this.logger.info(`Cancelling current post`);
      this.cancelToken?.cancel();
      return true;
    }
    return false;
  }

  /**
   * Check if this manager is currently posting.
   * @returns {boolean} True if posting
   */
  public isPosting(): boolean {
    return !!this.currentPost;
  }

  /**
   * Starts a post attempt.
   * @param {PostRecord} entity - The post record to start
   * @param {ResumeContext} [resumeContext] - Optional resume context from prior attempts
   */
  public async startPost(
    entity: PostRecord,
    resumeContext?: ResumeContext,
  ): Promise<void> {
    try {
      if (this.currentPost) {
        this.logger.warn(
          `PostManager is already posting, cannot start new post`,
        );
        return;
      }

      this.cancelToken = new CancellableToken();
      this.resumeContext = resumeContext || null;

      this.logger.withMetadata(entity.toDTO()).info(`Initializing post`);
      this.currentPost = entity;
      await this.postRepository.update(entity.id, {
        state: PostRecordState.RUNNING,
      });

      // Posts order occurs in batched groups
      // Standard websites first, then websites that accept external source urls
      this.logger.info(`Creating post order`);
      const postOrderGroups = this.getPostOrder(entity);

      this.logger.info(`Posting to websites`);
      for (const websites of postOrderGroups) {
        this.cancelToken.throwIfCancelled();
        await Promise.allSettled(
          websites.map((w) => this.postToWebsite(entity, w)),
        );
      }
      this.logger.info(`Finished posting to websites`);
    } catch (error) {
      this.logger.withError(error).error(`Error posting`);
    } finally {
      await this.finishPost(entity);
    }
  }

  /**
   * Post to a single website.
   * @protected
   * @param {PostRecord} entity - The post record
   * @param {WebsiteInfo} websiteInfo - The website information
   */
  protected async postToWebsite(
    entity: PostRecord,
    websiteInfo: WebsiteInfo,
  ): Promise<void> {
    const { submission } = entity;
    const { accountId, instance } = websiteInfo;
    let data: PostData | undefined;
    const option = submission.options.find((o) => o.accountId === accountId);

    try {
      if (!instance.getLoginState().isLoggedIn) {
        throw new Error('Not logged in');
      }

      const supportedTypes = instance.getSupportedTypes();
      if (!supportedTypes.includes(submission.type)) {
        throw new Error(
          `Website '${instance.decoratedProps.metadata.displayName}' does not support ${submission.type}`,
        );
      }

      this.logger.info('Preparing post data');
      data = await this.preparePostData(submission, instance, option);
      this.logger.withMetadata(data).info('Post data prepared');

      // Emit POST_ATTEMPT_STARTED event with post data
      await this.emitPostAttemptStarted(
        entity.id,
        accountId,
        instance,
        data,
        option,
      );

      this.logger.info('Validating submission');
      const validationResult =
        await this.validationService.validateSubmission(submission);
      if (validationResult.some((v) => v.errors.length > 0)) {
        throw new Error('Submission contains validation errors');
      }

      await this.attemptToPost(entity, accountId, instance, data);

      // Emit POST_ATTEMPT_COMPLETED event
      await this.postEventRepository.insert({
        postRecordId: entity.id,
        accountId,
        eventType: PostEventType.POST_ATTEMPT_COMPLETED,
        metadata: {
          accountSnapshot: {
            name: instance.account.name,
            website: instance.decoratedProps.metadata.name,
          },
        },
      });

      this.lastTimePostedToWebsite[accountId] = new Date();

      // Track successful post in App Insights (detailed)
      const websiteName = instance.decoratedProps.metadata.name;
      trackEvent('PostSuccess', {
        website: websiteName,
        accountId,
        submissionId: entity.submissionId,
        submissionType: submission.type,
        hasSourceUrl: 'unknown', // Individual managers track this
        fileCount: '0',
        options: this.redactPostDataForLogging(data),
      });

      // Track success metric per website
      trackMetric(`post.success.${websiteName}`, 1, {
        website: websiteName,
        submissionType: submission.type,
      });
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
                `${
                  instance.decoratedProps.metadata.displayName ||
                  instance.decoratedProps.metadata.name
                }: ${String(error)}`,
              );

      await this.handlePostFailure(
        entity.id,
        accountId,
        instance,
        errorResponse,
        data,
      );

      // Track failure in App Insights (detailed)
      const websiteName = instance.decoratedProps.metadata.name;

      // Only track non-cancellation failures
      if (!(error instanceof CancellationError)) {
        trackEvent('PostFailure', {
          website: websiteName,
          accountId,
          submissionId: entity.submissionId,
          submissionType: submission.type,
          errorMessage: errorResponse.message ?? 'unknown',
          stage: errorResponse.stage ?? 'unknown',
          hasException: errorResponse.exception ? 'true' : 'false',
          fileCount: '0',
          options: data ? this.redactPostDataForLogging(data) : '',
        });

        // Track failure metric per website
        trackMetric(`post.failure.${websiteName}`, 1, {
          website: websiteName,
          submissionType: submission.type,
        });

        // Track the exception if present
        if (errorResponse.exception) {
          trackException(errorResponse.exception, {
            website: websiteName,
            accountId,
            submissionId: entity.submissionId,
            stage: errorResponse.stage ?? 'unknown',
            errorMessage: errorResponse.message ?? 'unknown',
          });
        }
      }
    }
  }

  /**
   * Emit POST_ATTEMPT_STARTED event.
   * @protected
   * @param {EntityId} postRecordId - The post record ID
   * @param {AccountId} accountId - The account ID
   * @param {Website<unknown>} instance - The website instance
   * @param {PostData} [data] - The post data
   * @param {WebsiteOptions} [option] - The website options
   */
  protected async emitPostAttemptStarted(
    postRecordId: EntityId,
    accountId: AccountId,
    instance: Website<unknown>,
    data?: PostData,
    option?: WebsiteOptions,
  ): Promise<void> {
    await this.postEventRepository.insert({
      postRecordId,
      accountId,
      eventType: PostEventType.POST_ATTEMPT_STARTED,
      metadata: {
        accountSnapshot: {
          name: instance.account.name,
          website: instance.decoratedProps.metadata.name,
        },
        postData: data
          ? {
              parsedOptions: data.options,
              websiteOptions: option ? [] : [], // Blank for now; populate if needed later
            }
          : undefined,
      },
    });
  }

  /**
   * Handle post failure and emit appropriate events.
   * @protected
   * @param {EntityId} postRecordId - The post record ID
   * @param {AccountId} accountId - The account ID
   * @param {Website<unknown>} instance - The website instance
   * @param {PostResponse} errorResponse - The error response
   * @param {PostData} [postData] - The post data
   */
  protected async handlePostFailure(
    postRecordId: EntityId,
    accountId: AccountId,
    instance: Website<unknown>,
    errorResponse: PostResponse,
    postData?: PostData,
  ): Promise<void> {
    await this.postEventRepository.insert({
      postRecordId,
      accountId,
      eventType: PostEventType.POST_ATTEMPT_FAILED,
      error: {
        message: errorResponse.message || 'Unknown error',
        stack: errorResponse.exception?.stack,
        stage: errorResponse.stage,
        additionalInfo: errorResponse.additionalInfo,
      },
      metadata: {
        accountSnapshot: {
          name: instance.account.name,
          website: instance.decoratedProps.metadata.name,
        },
      },
    });

    await this.notificationService.create({
      type: 'error',
      title: `Failed to post to ${instance.decoratedProps.metadata.displayName}`,
      message: errorResponse.message || 'Unknown error',
      tags: ['post-failure', instance.decoratedProps.metadata.name],
      data: {},
    });
  }

  /**
   * Attempt to post to the website based on submission type.
   * @abstract
   * @protected
   * @param {PostRecord} entity - The post record
   * @param {AccountId} accountId - The account ID
   * @param {UnknownWebsite} instance - The website instance
   * @param {PostData} data - The post data
   */
  protected abstract attemptToPost(
    entity: PostRecord,
    accountId: AccountId,
    instance: UnknownWebsite,
    data: PostData,
  ): Promise<void>;

  /**
   * Prepare post data for a website.
   * @protected
   * @param {Submission} submission - The submission
   * @param {Website<unknown>} instance - The website instance
   * @param {WebsiteOptions} [option] - The website options
   * @returns {Promise<PostData>} The prepared post data
   */
  protected async preparePostData(
    submission: Submission,
    instance: Website<unknown>,
    option?: WebsiteOptions,
  ): Promise<PostData> {
    return this.postParserService.parse(submission, instance, option);
  }

  /**
   * Get post order for websites.
   * Groups websites into batches - standard websites first, then websites that accept external sources.
   * @protected
   * @param {PostRecord} entity - The post record
   * @returns {WebsiteInfo[][]} Batched website info
   */
  protected getPostOrder(entity: PostRecord): WebsiteInfo[][] {
    const { submission } = entity;
    const websiteInfos: WebsiteInfo[] = [];

    for (const option of submission.options) {
      const instance = this.websiteRegistry.findInstance(option.account);
      if (!instance) {
        this.logger.warn(`Website instance not found for ${option.accountId}`);
        continue;
      }

      if (!instance.getSupportedTypes().includes(submission.type)) {
        this.logger.warn(
          `Website ${instance.id} does not support ${submission.type}`,
        );
        continue;
      }

      // Skip if account is completed (based on resume context)
      if (
        this.resumeContext &&
        this.resumeContext.completedAccountIds.has(option.accountId)
      ) {
        this.logger.info(
          `Skipping account ${option.accountId} - already completed`,
        );
        continue;
      }

      websiteInfos.push({
        accountId: option.accountId,
        instance,
      });
    }

    // Split into batches: standard websites first, then websites that accept external sources
    const standard: WebsiteInfo[] = [];
    const acceptsExternal: WebsiteInfo[] = [];

    for (const info of websiteInfos) {
      // Check if website accepts source URLs by looking at fileOptions
      const acceptsSourceUrls =
        info.instance.decoratedProps.fileOptions?.acceptsExternalSourceUrls ??
        false;
      if (acceptsSourceUrls) {
        acceptsExternal.push(info);
      } else {
        standard.push(info);
      }
    }

    const batches: WebsiteInfo[][] = [];
    if (standard.length > 0) batches.push(standard);
    if (acceptsExternal.length > 0) batches.push(acceptsExternal);

    return batches;
  }

  /**
   * Finish the post and update the post record state.
   * @protected
   * @param {PostRecord} entity - The post record
   */
  protected async finishPost(entity: PostRecord): Promise<void> {
    this.currentPost = null;
    this.cancelToken = null;
    this.resumeContext = null;

    const entityInDb = await this.postRepository.findById(entity.id);
    if (!entityInDb) {
      this.logger.error(
        `Entity ${entity.id} not found in database. It may have been deleted while posting.`,
      );
      return;
    }

    // Query events to determine if post was successful
    const failedEvents = await this.postEventRepository.getFailedEvents(
      entity.id,
    );

    // DONE only if there are zero failures; any failure (including partial) means FAILED
    const state =
      failedEvents.length > 0 ? PostRecordState.FAILED : PostRecordState.DONE;

    await this.postRepository.update(entity.id, {
      state,
      completedAt: new Date().toISOString(),
    });

    trackMetric(
      'Post Duration',
      Date.now() - new Date(entity.createdAt).getTime(),
      {
        submissionType: entity.submission.type,
        state,
      },
    );

    this.logger.info(`Post ${entity.id} finished with state: ${state}`);
  }

  /**
   * Wait for posting wait interval to avoid rate limiting.
   * Uses the website's configured minimumPostWaitInterval.
   * @protected
   * @param {AccountId} accountId - The account ID
   * @param {Website<unknown>} instance - The website instance
   */
  protected async waitForPostingWaitInterval(
    accountId: AccountId,
    instance: Website<unknown>,
  ): Promise<void> {
    const lastTime = this.lastTimePostedToWebsite[accountId];
    if (!lastTime) return;

    const waitInterval =
      instance.decoratedProps.metadata.minimumPostWaitInterval ?? 0;
    if (!waitInterval) return;

    const now = new Date();
    const timeSinceLastPost = now.getTime() - lastTime.getTime();

    if (timeSinceLastPost < waitInterval) {
      const waitTime = waitInterval - timeSinceLastPost;
      this.logger.info(
        `Waiting ${waitTime}ms before posting to ${instance.id}`,
      );
      await new Promise((resolve) => {
        setTimeout(resolve, waitTime);
      });
    }
  }

  /**
   * Redact sensitive information from post data for logging.
   * @protected
   * @param {PostData} postData - The post data
   * @returns {string} Redacted post data as JSON string
   */
  protected redactPostDataForLogging(postData: PostData): string {
    const opts = { ...postData.options };
    // Redact sensitive information
    if (opts.description) {
      opts.description = `[REDACTED ${opts.description.length}]`;
    }
    return JSON.stringify({ options: opts });
  }
}
