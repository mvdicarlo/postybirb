import { Class } from 'type-fest';
import BaseWebsiteOptions from '../../../submission/models_maybe/base-website-options.model';
import MessageSubmission from '../../../submission/models_maybe/message-submission.model';
import PostData from '../../../submission/models_maybe/post-data.model';
import { UnknownWebsite } from '../../website';

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
