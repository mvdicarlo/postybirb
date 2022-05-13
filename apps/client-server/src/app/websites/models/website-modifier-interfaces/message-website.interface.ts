import { Class } from 'type-fest';
import BaseWebsiteOptions from '../../../submission/models/base-website-options.model';
import { MessageSubmission } from '../../../submission/models/message-submission.model';
import PostData from '../../../submission/models/post-data.model';
import { UnknownWebsite } from '../../website';

/**
 * Defines methods for allowing message (notification, journal, blob, etc.) based posting.
 * @interface MessageWebsite
 */
export interface MessageWebsite<T extends BaseWebsiteOptions> {
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
): websiteInstance is MessageWebsite<BaseWebsiteOptions> & UnknownWebsite {
  return Boolean(
    (websiteInstance as MessageWebsite<BaseWebsiteOptions> & UnknownWebsite)
      .supportsMessage
  );
}
