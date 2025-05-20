import {
  IPostResponse,
  IWebsiteFormFields,
  PostData,
  SimpleValidationResult,
} from '@postybirb/types';

import { CancellableToken } from '../../../post/models/cancellable-token';
import { UnknownWebsite } from '../../website';
import { BaseWebsiteOptions } from '../base-website-options';

export const MessageWebsiteKey = 'createMessageModel';

/**
 * Defines methods for allowing message (notification, journal, blob, etc.) based posting.
 * @interface MessageWebsite
 */
export interface MessageWebsite<
  T extends IWebsiteFormFields = IWebsiteFormFields,
> {
  createMessageModel(): BaseWebsiteOptions;

  onPostMessageSubmission(
    postData: PostData<T>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse>;

  onValidateMessageSubmission(
    postData: PostData<T>,
  ): Promise<SimpleValidationResult>;
}

export function isMessageWebsite(
  websiteInstance: UnknownWebsite,
): websiteInstance is MessageWebsite & UnknownWebsite {
  return Boolean(
    (websiteInstance as MessageWebsite & UnknownWebsite).supportsMessage,
  );
}
