import { TwitterUnofficialMessageSubmission } from './twitter-unofficial-message-submission';

/**
 * Rettiwt-API has no support for sensitive media flags, so unlike the
 * official Twitter implementation there is no `contentBlur` field here.
 */
export class TwitterUnofficialFileSubmission extends TwitterUnofficialMessageSubmission {}