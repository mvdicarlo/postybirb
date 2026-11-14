import {
  FileType,
  ImageResizeProps,
  ISubmissionFile,
  LoginResult,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import { isAxiosError } from 'axios';
import { chunk, uniqBy } from 'lodash';
import { Rettiwt, SensitiveWarning, TwitterError } from 'rettiwt-api';
import { extractMentions, parseTweet } from 'twitter-text';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { SubmissionValidator } from '../../commons/validator';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { TwitterUnofficialAccountData } from './models/twitter-unofficial-account-data';
import {
  ContentBlurValue,
  TwitterUnofficialFileSubmission,
} from './models/twitter-unofficial-file-submission';
import { TwitterUnofficialMessageSubmission } from './models/twitter-unofficial-message-submission';
import { uploadMedia } from './twitter-unofficial-media-upload';

type RettiwtSession = {
  rettiwt: Rettiwt;
  userId: string;
  /** Raw cookies + csrf token, for the media upload */
  cookieHeader: string;
  ct0: string;
};

type ThreadOptions = {
  text: string;
  files: PostingFile[];
  replyToId?: string;
  quoteId?: string;
  contentBlur?: ContentBlurValue;
  blockGrokEdit?: boolean;
};

type Validator =
  | SubmissionValidator<TwitterUnofficialFileSubmission>
  | SubmissionValidator<TwitterUnofficialMessageSubmission>;

const MAX_ALT_TEXT_LENGTH = 1000;

@WebsiteMetadata({
  name: 'twitter-unofficial',
  displayName: 'Twitter / X (Unofficial)',
})
@UserLoginFlow('https://x.com/i/flow/login')
@SupportsFiles({
  fileBatchSize: 120,
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'video/mp4',
    'video/mov',
    'image/webp',
  ],
  acceptedFileSizes: {
    'image/gif': FileSize.megabytes(15),
    [FileType.IMAGE]: FileSize.megabytes(5),
    [FileType.VIDEO]: FileSize.megabytes(512),
  },
  maxAltTextLength: MAX_ALT_TEXT_LENGTH,
})
@DisableAds()
export default class TwitterUnofficial
  extends Website<TwitterUnofficialAccountData>
  implements
    FileWebsite<TwitterUnofficialFileSubmission>,
    MessageWebsite<TwitterUnofficialMessageSubmission>
{
  protected BASE_URL = 'https://x.com';

  /** X allows up to 20 photos / videos / GIFs per post, in any mix */
  private readonly MAX_MEDIA_PER_TWEET = 20;

  private readonly MAX_TWEET_LENGTH = 280;

  /** Validation runs often, so remote lookups (mentions, quoted posts) are cached */
  private readonly LOOKUP_TTL_MS = 5 * 60 * 1000;

  private readonly lookupCache = new Map<
    string,
    { value: boolean; expires: number }
  >();

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TwitterUnofficialAccountData> =
    {
      userName: true,
    };

  // ---------------------------------------------------------------------------
  // Session / login
  // ---------------------------------------------------------------------------

  /**
   * Builds a Rettiwt session from the cookies of the logged in account.
   * Rettiwt's API_KEY is just base64("auth_token=..;ct0=..;twid=..;").
   */
  private async createSession(): Promise<RettiwtSession | undefined> {
    const cookies = await this.platform.http.getWebsiteCookies(
      this.accountId,
      this.BASE_URL,
    );

    const authToken = cookies.find((c) => c.name === 'auth_token')?.value;
    const ct0 = cookies.find((c) => c.name === 'ct0')?.value;
    const twid = cookies.find((c) => c.name === 'twid')?.value;

    if (!authToken || !ct0 || !twid) {
      return undefined;
    }

    // twid is "u%3D<userId>" (url encoded) or "u=<userId>"
    const userId = decodeURIComponent(twid)
      .replace(/^u=/, '')
      .replace(/"/g, '');
    if (!userId) {
      return undefined;
    }

    const apiKey = Buffer.from(
      `auth_token=${authToken};ct0=${ct0};twid=${twid};`,
    ).toString('base64');

    return {
      rettiwt: new Rettiwt({
        apiKey,
        logging: true,
        errorHandler: {
          // Rettiwt's default handler it treats ANY non axios error as Unknown error
          // Some services inside Rettiwt throw TwitterError which also gets converted to 
          // Unknown error leaving vital information behind. 
          handle(error) {
            if (isAxiosError(error)) {
              throw new TwitterError(error);
            }
            throw error;
          },
        },
      }),
      userId,
      cookieHeader: `auth_token=${authToken}; ct0=${ct0}; twid=${twid}`,
      ct0,
    };
  }

  private async requireSession(): Promise<RettiwtSession> {
    const session = await this.createSession();
    if (!session) {
      throw new Error('Not logged in: missing X/Twitter session cookies');
    }
    return session;
  }

  public async onLogin(): Promise<LoginResult> {
    // Touch the base page so the partition's cookies are populated/refreshed
    await this.platform.http.get<string>(this.BASE_URL, {
      partition: this.accountId,
    });

    const session = await this.createSession();
    if (!session) {
      return { loggedIn: false };
    }

    try {
      const user = await session.rettiwt.user.details(session.userId);
      if (!user?.userName) {
        return { loggedIn: false };
      }

      await this.setWebsiteData({ userName: user.userName });
      return { loggedIn: true, username: user.userName };
    } catch (e) {
      this.logger.withError(e).warn('Failed to verify X/Twitter session');
      return { loggedIn: false };
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildUrl(tweetId?: string): string | undefined {
    if (!tweetId) {
      return undefined;
    }
    const { userName } = this.getWebsiteData();
    return userName
      ? `https://x.com/${userName}/status/${tweetId}`
      : `https://x.com/i/web/status/${tweetId}`;
  }

  /** Accepts a tweet URL (x.com / twitter.com) or a bare numeric id. */
  private parseTweetId(url?: string): string | undefined {
    const trimmed = url?.trim();
    if (!trimmed) {
      return undefined;
    }
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }
    return trimmed.match(
      /(?:x|twitter)\.com\/(?:[^/?#]+|i\/web)\/status(?:es)?\/(\d+)/i,
    )?.[1];
  }

  private toSensitiveWarning(
    blur?: ContentBlurValue,
  ): SensitiveWarning[] | undefined {
    switch (blur) {
      case 'adult_content':
        return [SensitiveWarning.ADULT_CONTENT];
      case 'graphic_violence':
        return [SensitiveWarning.GRAPHIC_VIOLENCE];
      case 'other':
        return [SensitiveWarning.OTHER];
      default:
        return undefined;
    }
  }

  private async uploadFile(
    session: RettiwtSession,
    file: PostingFile,
    options: Pick<ThreadOptions, 'contentBlur' | 'blockGrokEdit'>,
  ): Promise<string> {
    const id = await uploadMedia(session, file.buffer, file.mimeType);

    // Non-fatal: the post is still valid without the metadata
    const altText =
      file.metadata?.altText?.trim().slice(0, MAX_ALT_TEXT_LENGTH) || undefined;
    const sensitiveWarning = this.toSensitiveWarning(options.contentBlur);
    if (altText || sensitiveWarning || options.blockGrokEdit) {
      try {
        await session.rettiwt.tweet.setMediaMetadata(id, {
          altText,
          sensitiveWarning,
          blockGrokEdit: options.blockGrokEdit,
        });
      } catch (e) {
        this.logger.withError(e).warn(`Failed to set metadata for media ${id}`);
      }
    }

    return id;
  }

  /**
   * Posts the text with the files. Files go in batches of MAX_MEDIA_PER_TWEET
   * (any mix of images, videos and GIFs): the first tweet carries the text and
   * replies to / quotes the requested post, extra batches are posted as
   * media-only replies to the previous tweet.
   */
  private async postThread(
    options: ThreadOptions,
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    const session = await this.requireSession();
    const { rettiwt } = session;

    const fileBatches = chunk(options.files, this.MAX_MEDIA_PER_TWEET);
    const total = Math.max(fileBatches.length, 1);
    const tweetIds: string[] = [];
    let stage = 'initializing';

    try {
      for (let i = 0; i < total; i++) {
        cancellationToken.throwIfAborted();

        const batch = fileBatches[i] ?? [];
        const media: Array<{ id: string }> = [];
        for (const [fileI, file] of batch.entries()) {
          cancellationToken.throwIfAborted();
          stage = `uploading file ${fileI + 1}/${batch.length} (${file.fileName}, tweet ${i + 1}/${total})`;
          media.push({ id: await this.uploadFile(session, file, options) });
        }

        stage = `creating tweet ${i + 1}/${total}`;
        const tweetId = await rettiwt.tweet.post({
          text: i === 0 ? options.text : '',
          media: media.length ? media : undefined,
          replyTo: i === 0 ? options.replyToId : tweetIds[i - 1],
          quote: i === 0 ? options.quoteId : undefined,
        });

        if (!tweetId) {
          throw new Error('Twitter did not return a tweet id');
        }
        tweetIds.push(tweetId);
      }
    } catch (err) {
      const cleanupSuccess = await this.cleanUpFailedPost(rettiwt, tweetIds);
      return PostResponse.fromWebsite(this)
        .withMessage(
          `Post failed at ${stage}${
            cleanupSuccess
              ? ''
              : ' and was unable to delete partially created tweets (manual cleanup needed)'
          }`,
        )
        .withAdditionalInfo({
          tweetIds,
          details:
            err instanceof TwitterError
              ? err.details.map((e) => ({
                  code: e.code,
                  message: e.message,
                  name: e.name,
                  type: e.type,
                }))
              : [],
        })
        .withException(err instanceof Error ? err : new Error(String(err)));
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({ tweetIds })
      .withSourceUrl(this.buildUrl(tweetIds[0]));
  }

  private async cleanUpFailedPost(
    rettiwt: Rettiwt,
    tweetIds: string[],
  ): Promise<boolean> {
    // A single successfully created tweet is still a valid post
    if (tweetIds.length <= 1) {
      return true;
    }

    let success = true;
    // Most recent first
    for (const id of [...tweetIds].reverse()) {
      try {
        await rettiwt.tweet.unpost(id);
      } catch (e) {
        success = false;
        this.logger.withError(e).warn(`Failed to delete tweet ${id}`);
      }
    }

    return success;
  }

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

  createFileModel(): TwitterUnofficialFileSubmission {
    return new TwitterUnofficialFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<TwitterUnofficialFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
    const { options } = postData;

    return this.postThread(
      {
        text: options.description ?? '',
        files,
        replyToId: this.parseTweetId(options.replyToUrl),
        quoteId: this.parseTweetId(options.quotePostUrl),
        contentBlur: options.contentBlur,
        blockGrokEdit: options.blockGrokEdit,
      },
      cancellationToken,
    );
  }

  async onValidateFileSubmission(
    postData: PostData<TwitterUnofficialFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TwitterUnofficialFileSubmission>();

    this.validateDescriptionLength(postData, validator);
    this.validateRating(postData, validator);
    this.validateReplyToUrl(postData, validator);
    await this.validateQuotePostUrl(postData, validator);
    await this.validateMentions(postData, validator);

    return validator.result;
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  createMessageModel(): TwitterUnofficialMessageSubmission {
    return new TwitterUnofficialMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<TwitterUnofficialMessageSubmission>,
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
    const { options } = postData;

    return this.postThread(
      {
        text: options.description ?? '',
        files: [],
        replyToId: this.parseTweetId(options.replyToUrl),
        quoteId: this.parseTweetId(options.quotePostUrl),
      },
      cancellationToken,
    );
  }

  async onValidateMessageSubmission(
    postData: PostData<TwitterUnofficialMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator =
      this.createValidator<TwitterUnofficialMessageSubmission>();

    this.validateDescriptionLength(postData, validator);
    this.validateReplyToUrl(postData, validator);
    await this.validateQuotePostUrl(postData, validator);
    await this.validateMentions(postData, validator);

    return validator.result;
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  private async cachedLookup(
    key: string,
    lookup: () => Promise<boolean>,
  ): Promise<boolean> {
    const hit = this.lookupCache.get(key);
    if (hit && hit.expires > Date.now()) {
      return hit.value;
    }

    const value = await lookup();
    this.lookupCache.set(key, {
      value,
      expires: Date.now() + this.LOOKUP_TTL_MS,
    });
    return value;
  }

  private validateDescriptionLength(
    postData: PostData<TwitterUnofficialMessageSubmission>,
    validator: Validator,
  ): void {
    const { weightedLength } = parseTweet(postData.options.description ?? '');
    if (weightedLength > this.MAX_TWEET_LENGTH) {
      validator.error(
        'validation.description.max-length',
        {
          maxLength: this.MAX_TWEET_LENGTH,
          currentLength: weightedLength,
        },
        'description',
      );
    }
  }

  /**
   * Rettiwt can't set X's sensitive media flag from the rating, so users must
   * pick contentBlur themselves. Warn so non-general images aren't posted unlabeled.
   */
  private validateRating(
    postData: PostData<TwitterUnofficialFileSubmission>,
    validator: SubmissionValidator<TwitterUnofficialFileSubmission>,
  ): void {
    const { rating, contentBlur } = postData.options;
    // Undefined rating is handled by the default part validator
    if (rating && rating !== SubmissionRating.GENERAL && !contentBlur) {
      validator.warning(
        'validation.file.twitter-unofficial.rating-matches-default',
        {},
        'contentBlur',
      );
    }
  }

  private validateReplyToUrl(
    postData: PostData<TwitterUnofficialMessageSubmission>,
    validator: Validator,
  ): void {
    const url = postData.options.replyToUrl;
    if (url?.trim() && !this.parseTweetId(url)) {
      validator.error(
        'validation.replyurl.invalid-reply-url',
        { error: '' },
        'replyToUrl',
      );
    }
  }

  private async validateQuotePostUrl(
    postData: PostData<TwitterUnofficialMessageSubmission>,
    validator: Validator,
  ): Promise<void> {
    const url = postData.options.quotePostUrl;
    if (!url?.trim()) {
      return;
    }

    const tweetId = this.parseTweetId(url);
    if (!tweetId) {
      validator.error(
        'validation.quoteurl.invalid-quote-url',
        { error: 'Invalid post URL' },
        'quotePostUrl',
      );
      return;
    }

    // Not logged in: nothing to check against, login state is validated elsewhere
    const session = await this.createSession();
    if (!session) {
      return;
    }

    try {
      const exists = await this.cachedLookup(`tweet:${tweetId}`, async () =>
        Boolean(await session.rettiwt.tweet.details(tweetId)),
      );

      if (!exists) {
        validator.error(
          'validation.quoteurl.invalid-quote-url',
          { error: 'Post not found' },
          'quotePostUrl',
        );
      }
    } catch (e) {
      validator.error(
        'validation.quoteurl.invalid-quote-url',
        { error: e instanceof Error ? e.message : String(e) },
        'quotePostUrl',
      );
    }
  }

  /**
   * twitter-text only extracts real mentions, so things like "@/someone",
   * emails or a lone "@" are ignored and never reported.
   */
  private async validateMentions(
    postData: PostData<TwitterUnofficialMessageSubmission>,
    validator: Validator,
  ): Promise<void> {
    const mentions = uniqBy(
      extractMentions(postData.options.description ?? ''),
      (m) => m.toLowerCase(),
    );
    if (!mentions.length) {
      return;
    }

    const session = await this.createSession();
    if (!session) {
      return;
    }

    const invalidMentions: string[] = [];
    for (const mention of mentions) {
      try {
        const exists = await this.cachedLookup(
          `user:${mention.toLowerCase()}`,
          async () => Boolean(await session.rettiwt.user.details(mention)),
        );
        if (!exists) {
          invalidMentions.push(`@${mention}`);
        }
      } catch (e) {
        // Lookup failed (rate limit, network): can't tell, so don't block the post
        this.logger.withError(e).warn(`Could not verify mention @${mention}`);
      }
    }

    if (invalidMentions.length) {
      validator.error(
        'validation.description.twitter-unofficial.invalid-mentions',
        { mentions: invalidMentions },
        'description',
      );
    }
  }
}
