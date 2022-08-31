import { Class } from 'type-fest';
import { BaseOptions } from '../../../submission/models/base-website-options';
import { MessageSubmission } from '../../../submission/models/message-submission';
import PostData from '../../../submission/models/post-data';
import { UnknownWebsite } from '../../website';

/**
 * Defines methods for allowing message (notification, journal, blob, etc.) based posting.
 * @interface MessageWebsite
 */
export interface MessageWebsite<T extends BaseOptions> {
  MessageModel: Class<T>;
  supportsMessage: true;

  createMessageModel(): T;

  onPostMessageSubmission(
    postData: PostData<T>,
    cancellationToken: unknown
  ): Promise<unknown>;

  onValidateMessageSubmission(
    submissionData: MessageSubmission,
    postData: PostData<T>
  ): Promise<unknown>;
}

export function isMessageWebsite(
  websiteInstance: UnknownWebsite
): websiteInstance is MessageWebsite<BaseOptions> & UnknownWebsite {
  return Boolean(
    (websiteInstance as MessageWebsite<BaseOptions> & UnknownWebsite)
      .supportsMessage
  );
}
