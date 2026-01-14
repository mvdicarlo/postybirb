import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
    AccountId,
    PostData,
    PostEventType,
    SubmissionType,
} from '@postybirb/types';
import { PostRecord } from '../../../drizzle/models';
import { NotificationsService } from '../../../notifications/notifications.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
import { MessageWebsite } from '../../../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { PostEventRepository } from '../post-record-factory';
import { BasePostManager } from './base-post-manager.service';

/**
 * PostManager for message submissions.
 * Handles message-only posting.
 * @class MessageSubmissionPostManager
 */
@Injectable()
export class MessageSubmissionPostManager extends BasePostManager {
  protected readonly logger = Logger(this.constructor.name);

  constructor(
    postEventRepository: PostEventRepository,
    websiteRegistry: WebsiteRegistryService,
    postParserService: PostParsersService,
    validationService: ValidationService,
    notificationService: NotificationsService,
  ) {
    super(
      postEventRepository,
      websiteRegistry,
      postParserService,
      validationService,
      notificationService,
    );
  }

  getSupportedType(): SubmissionType {
    return SubmissionType.MESSAGE;
  }

  protected async attemptToPost(
    entity: PostRecord,
    accountId: AccountId,
    instance: UnknownWebsite,
    data: PostData,
  ): Promise<void> {
    this.logger.info(`Posting message to ${instance.id}`);

    await this.waitForPostingWaitInterval(accountId);
    this.cancelToken.throwIfCancelled();

    const result = await (
      instance as unknown as MessageWebsite
    ).onPostMessageSubmission(data, this.cancelToken);

    if (result.exception) {
      // Emit MESSAGE_FAILED event
      await this.postEventRepository.insert({
        postRecordId: entity.id,
        accountId,
        eventType: PostEventType.MESSAGE_FAILED,
        error: {
          message: result.message || 'Unknown error',
          stack: result.exception?.stack,
          stage: result.stage,
          additionalInfo: result.additionalInfo,
        },
        metadata: {
          accountSnapshot: {
            name: instance.account.name,
            website: instance.decoratedProps.metadata.name,
          },
          responseMessage: result.message,
        },
      });

      throw result.exception;
    }

    // Emit MESSAGE_POSTED event
    await this.postEventRepository.insert({
      postRecordId: entity.id,
      accountId,
      eventType: PostEventType.MESSAGE_POSTED,
      sourceUrl: result.sourceUrl,
      metadata: {
        accountSnapshot: {
          name: instance.account.name,
          website: instance.decoratedProps.metadata.name,
        },
        responseMessage: result.message,
      },
    });

    this.logger.withMetadata(result).info(`Message posted to ${instance.id}`);
  }

  /**
   * Wait for posting wait interval to avoid rate limiting.
   * @private
   * @param {AccountId} accountId - The account ID
   */
  private async waitForPostingWaitInterval(
    accountId: AccountId,
  ): Promise<void> {
    const lastTime = this.lastTimePostedToWebsite[accountId];
    if (!lastTime) return;

    const now = new Date();
    const diff = now.getTime() - lastTime.getTime();
    const minInterval = 5000; // 5 seconds between posts

    if (diff < minInterval) {
      const waitTime = minInterval - diff;
      this.logger.info(`Waiting ${waitTime}ms before posting to ${accountId}`);
      await new Promise((resolve) => {
        setTimeout(resolve, waitTime);
      });
    }
  }
}
