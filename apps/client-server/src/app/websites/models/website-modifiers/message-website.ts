import {
  IWebsiteFormFields,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';

import { CancellableToken } from '../../../post/models/cancellable-token';
import { UnknownWebsite } from '../../website';

export const MessageWebsiteKey = 'createMessageModel';

/**
 * Defines methods for allowing message (notification, journal, blob, etc.) based posting.
 * @interface MessageWebsite
 */
export interface MessageWebsite<
  T extends IWebsiteFormFields = IWebsiteFormFields,
> {
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
