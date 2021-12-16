import BaseWebsiteOptions from '../../../submission/models_maybe/base-website-options.model';
import MessageSubmission from '../../../submission/models_maybe/message-submission.model';
import PostData from '../../../submission/models_maybe/post-data.model';
import { Class } from 'type-fest';

export interface MessageWebsite<T extends BaseWebsiteOptions> {
  messageModel: Class<T>;
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
