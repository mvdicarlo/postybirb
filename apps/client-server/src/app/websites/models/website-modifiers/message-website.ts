import {
  IBaseWebsiteOptions,
  MessageSubmission,
  PostData,
  ValidationResult,
} from '@postybirb/types';
import { Class } from 'type-fest';

import { UnknownWebsite } from '../../website';

/**
 * Defines methods for allowing message (notification, journal, blob, etc.) based posting.
 * @interface MessageWebsite
 */
export interface MessageWebsite<T extends IBaseWebsiteOptions> {
  MessageModel: Class<T>;
  supportsMessage: true;

  createMessageModel(): T;

  onPostMessageSubmission(
    postData: PostData<MessageSubmission, T>,
    cancellationToken: unknown
  ): Promise<unknown>;

  onValidateMessageSubmission(
    postData: PostData<MessageSubmission, T>
  ): Promise<ValidationResult<T>>;
}

export function isMessageWebsite(
  websiteInstance: UnknownWebsite
): websiteInstance is MessageWebsite<IBaseWebsiteOptions> & UnknownWebsite {
  return Boolean(
    (websiteInstance as MessageWebsite<IBaseWebsiteOptions> & UnknownWebsite)
      .supportsMessage
  );
}
