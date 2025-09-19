/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@postybirb/logger';
import { PostData } from '@postybirb/types';
import {
  InlineErrorV2,
  TweetV2PostTweetResult,
  TwitterApi,
} from 'twitter-api-v2';
import { PostingFile } from '../../../../post/models/posting-file';
import { TwitterFileSubmission } from '../models/twitter-file-submission';
import { TwitterMessageSubmission } from '../models/twitter-message-submission';

export interface TwitterAuthLinkResult {
  url: string;
  oauthToken: string;
  oauthTokenSecret: string;
}

export interface TwitterAccessTokenResult {
  accessToken: string;
  accessTokenSecret: string;
  screenName?: string;
  userId?: string;
}

export interface TwitterAccessKeys {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface TweetResultMeta {
  id?: string;
  text?: string;
  mediaIds: string[];
  url?: string;
  replyTo?: string;
  success: boolean;
  error?: string;
  raw?: unknown;
}

export type ContentBlurValue =
  | undefined
  | 'other'
  | 'adult_content'
  | 'graphic_violence'
  | 'graphical_violence';

/**
 *
 * Wrapper for Twitter API calls
 * Primarily uses twitter-api-v2
 *
 * @class TwitterApiServiceV2
 */
export class TwitterApiServiceV2 {
  private static Logger = Logger(TwitterApiServiceV2.constructor.name);

  /**
   * Create an authenticated Twitter client
   */
  private static createClient(auth: TwitterAccessKeys): TwitterApi {
    return new TwitterApi({
      appKey: auth.apiKey,
      appSecret: auth.apiSecret,
      accessToken: auth.accessToken,
      accessSecret: auth.accessTokenSecret,
    });
  }

  /**
   * Upload media files and apply metadata (alt text, content warnings)
   */
  static async uploadMediaFiles(
    client: TwitterApi,
    files: PostingFile[],
    contentBlur?: ContentBlurValue,
  ): Promise<{ mediaIds: string[]; errors: TweetResultMeta[] }> {
    const mediaIds: string[] = [];
    const errors: TweetResultMeta[] = [];

    for (const file of files) {
      try {
        const mediaId = await client.v1.uploadMedia(file.buffer, {
          mimeType: file.mimeType,
        });
        mediaIds.push(mediaId);

        // Apply alt text or sensitive media metadata if provided
        const altText = file.metadata?.altText?.trim();

        if (altText || contentBlur) {
          try {
            const body: Record<string, unknown> = { media_id: mediaId };

            if (altText) {
              body.alt_text = { text: altText.substring(0, 1000) };
            }

            if (contentBlur) {
              body.sensitive_media_warning = [
                contentBlur === 'graphical_violence'
                  ? 'graphic_violence'
                  : contentBlur,
              ];
            }

            await client.v1.post('media/metadata/create.json', body);
          } catch (metaErr) {
            // Non-fatal – collect metadata failure info
            errors.push({
              mediaIds: [mediaId],
              success: false,
              error: `Failed to set metadata for media ${mediaId}: ${
                metaErr instanceof Error ? metaErr.message : String(metaErr)
              }`,
            });
          }
        }
      } catch (uploadErr) {
        throw new Error(
          `Upload failed: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`,
        );
      }
    }

    return { mediaIds, errors };
  }

  /**
   * Get authenticated user information for URL construction
   */
  static async getUserInfo(client: TwitterApi): Promise<string | undefined> {
    try {
      const me = await client.v2.me();
      return (me as unknown as { data?: { username?: string } })?.data
        ?.username;
    } catch {
      // Ignore errors - will fallback to generic URL format
      return undefined;
    }
  }

  /**
   * Convert media IDs array to Twitter API v2 tuple format
   */
  private static toMediaIdsTuple(
    ids: string[],
  ):
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | undefined {
    switch (ids.length) {
      case 0:
        return undefined;
      case 1:
        return [ids[0]];
      case 2:
        return [ids[0], ids[1]];
      case 3:
        return [ids[0], ids[1], ids[2]];
      default:
        return [ids[0], ids[1], ids[2], ids[3]];
    }
  }

  /**
   * Post a tweet with optional media
   */
  static async postTweet(
    client: TwitterApi,
    text: string,
    mediaIds: string[] = [],
    replyToId?: string,
  ): Promise<{ tweetId?: string; tweetResponse: TweetV2PostTweetResult }> {
    const tweetPayload = {
      text: text || undefined,
      media: mediaIds.length
        ? { media_ids: this.toMediaIdsTuple(mediaIds) }
        : undefined,
      reply: replyToId ? { in_reply_to_tweet_id: replyToId } : undefined,
    };

    const tweetResponse = await client.v2.tweet(tweetPayload);

    if (tweetResponse.errors?.length) {
      throw new Error(
        `Failed to post tweet: ${tweetResponse.errors
          .map(
            (e: InlineErrorV2) =>
              `${e.title}: ${e.detail}${e.type ? ` (${e.type})` : ''}${e.reason ? ` - ${e.reason}` : ''}`,
          )
          .join(', ')}`,
      );
    }

    const tweetId = tweetResponse.data.id;

    return { tweetId, tweetResponse };
  }

  /**
   * Generate a PIN-based (oob) auth link.
   */
  static async generateAuthLink(
    apiKey: string,
    apiSecret: string,
  ): Promise<TwitterAuthLinkResult> {
    const client = new TwitterApi({ appKey: apiKey, appSecret: apiSecret });
    const { url, oauth_token, oauth_token_secret } =
      await client.generateAuthLink('oob');
    return {
      url,
      oauthToken: oauth_token,
      oauthTokenSecret: oauth_token_secret,
    };
  }

  /**
   * Exchange verifier (PIN) for access tokens.
   */
  static async login(
    apiKey: string,
    apiSecret: string,
    oauthToken: string,
    oauthTokenSecret: string,
    verifier: string,
  ): Promise<TwitterAccessTokenResult> {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret,
    });

    const { accessToken, accessSecret, screenName, userId } =
      await client.login(verifier);
    return {
      accessToken,
      accessTokenSecret: accessSecret,
      screenName: screenName ?? undefined,
      userId: userId?.toString(),
    };
  }

  static async postStatus(
    auth: TwitterAccessKeys,
    data: PostData<TwitterMessageSubmission>,
    replyTo?: string,
  ): Promise<TweetResultMeta> {
    try {
      const client = this.createClient(auth);
      const postResult = await this.postTweet(
        client,
        data.options.description ?? '',
        [],
        replyTo,
      );
      const username = await this.getUserInfo(client);

      const url = postResult.tweetId
        ? username
          ? `https://x.com/${username}/status/${postResult.tweetId}`
          : `https://x.com/i/web/status/${postResult.tweetId}`
        : undefined;

      return {
        id: postResult.tweetId,
        success: true,
        mediaIds: [],
        url,
        text: data.options.description ?? '',
        raw: postResult.tweetResponse,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        mediaIds: [],
      };
    }
  }

  static async postMedia(
    auth: TwitterAccessKeys,
    files: PostingFile[],
    data: PostData<TwitterFileSubmission>,
    replyTo?: string,
  ): Promise<TweetResultMeta> {
    try {
      // Validate credentials
      if (
        !auth?.apiKey ||
        !auth?.apiSecret ||
        !auth?.accessToken ||
        !auth?.accessTokenSecret
      ) {
        return {
          success: false,
          error: 'Missing API credentials',
          mediaIds: [],
        };
      }

      const client = this.createClient(auth);

      const { contentBlur } = data.options;
      const text = data.options.description ?? '';

      // Upload media files with metadata
      const { mediaIds, errors } = await this.uploadMediaFiles(
        client,
        files,
        contentBlur,
      );

      if (errors.length) {
        errors.forEach((err) => {
          TwitterApiServiceV2.Logger.withMetadata(err).warn(
            'There was a non-fatal issue posting media',
          );
        });
      }

      // Get user info for URL construction
      const username = await this.getUserInfo(client);

      // Post the tweet
      try {
        const { tweetId, tweetResponse } = await this.postTweet(
          client,
          text,
          mediaIds,
          replyTo,
        );

        const url = tweetId
          ? username
            ? `https://x.com/${username}/status/${tweetId}`
            : `https://x.com/i/web/status/${tweetId}`
          : undefined;

        const result: TweetResultMeta = {
          id: tweetId,
          text,
          mediaIds,
          url,
          success: true,
          raw: tweetResponse,
        };

        return result;
      } catch (postErr) {
        const errorResult: TweetResultMeta = {
          mediaIds,
          success: false,
          error: postErr instanceof Error ? postErr.message : String(postErr),
        };

        return errorResult;
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        mediaIds: [],
      };
    }
  }

  /**
   * Delete all tweets in a failed reply chain
   */
  public static async deleteFailedReplyChain(
    auth: TwitterAccessKeys,
    ids: string[],
  ): Promise<{ deletedIds: string[]; errors: string[] }> {
    const deletedIds: string[] = [];
    const errors: string[] = [];

    try {
      // Validate credentials
      if (
        !auth?.apiKey ||
        !auth?.apiSecret ||
        !auth?.accessToken ||
        !auth?.accessTokenSecret
      ) {
        throw new Error('Missing API credentials');
      }

      const client = this.createClient(auth);

      // Delete tweets in reverse order (most recent first)
      const idsToDelete = [...ids].reverse();

      for (const tweetId of idsToDelete) {
        if (!tweetId) continue;

        try {
          await client.v2.deleteTweet(tweetId);
          deletedIds.push(tweetId);
          this.Logger.debug(`Successfully deleted tweet ${tweetId}`);
        } catch (deleteErr) {
          const errorMsg = `Failed to delete tweet ${tweetId}: ${
            deleteErr instanceof Error ? deleteErr.message : String(deleteErr)
          }`;
          errors.push(errorMsg);
          this.Logger.error(errorMsg);
        }
      }

      return { deletedIds, errors };
    } catch (err) {
      const errorMsg = `Failed to delete reply chain: ${
        err instanceof Error ? err.message : String(err)
      }`;
      this.Logger.error(errorMsg);
      return { deletedIds, errors: [errorMsg] };
    }
  }
}
