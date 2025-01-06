import {
  IWebsiteFormFields,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { Class } from 'type-fest';

import { CancellableToken } from '../../../post/models/cancellable-token';
import { UnknownWebsite } from '../../website';

export const MessageWebsiteKey = 'MessageModel';

/**
 * Defines methods for allowing message (notification, journal, blob, etc.) based posting.
 * @interface MessageWebsite
 */
export interface MessageWebsite<
  T extends IWebsiteFormFields = IWebsiteFormFields,
> {
  MessageModel: Class<T>;

  createMessageModel(): T;

  onPostMessageSubmission(
    postData: PostData<T>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse>;

  onValidateMessageSubmission(
    postData: PostData<T>,
  ): Promise<SimpleValidationResult>;
}

export function isMessageWebsite(
  websiteInstance: UnknownWebsite,
): websiteInstance is MessageWebsite<IWebsiteFormFields> & UnknownWebsite {
  return Boolean(
    (websiteInstance as MessageWebsite<IWebsiteFormFields> & UnknownWebsite)
      .supportsMessage,
  );
}
