import BaseWebsiteOptions from '../../submission/models/base-website-options.model';
import MessageSubmission from '../../submission/models/message-submission.model';
import PostData from '../../submission/models/post-data.model';
import { Ctor } from '../../shared/interfaces/constructor.interface';

export interface MessageWebsite<T extends BaseWebsiteOptions> {
  messageModel: Ctor<T>;
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
