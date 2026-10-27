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
import { chunk, uniqBy } from 'lodash';
import { Rettiwt } from 'rettiwt-api';
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
import {
  SensitiveMediaWarning,
  setMediaMetadata,
} from './twitter-unofficial-media-metadata';

type RettiwtSession = {
  rettiwt: Rettiwt;
  userId: string;
  /** Raw cookie header + csrf token, only needed for media metadata */
  cookieHeader: string;
  ct0: string;
};

type ThreadOptions = {
  /** One entry per tweet, in order */
  textChunks: string[];
  files: PostingFile[];
  replyToId?: string;
  quoteId?: string;
  contentBlur?: ContentBlurValue;
  blockGrokEdit?: boolean;
};

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
    [FileType.VIDEO]: FileSize.megabytes(15),
  },
  maxAltTextLength: 1000,
})
@DisableAds()
export default class TwitterUnofficial
  extends Website<TwitterUnofficialAccountData>
  implements
    FileWebsite<TwitterUnofficialFileSubmission>,
    MessageWebsite<TwitterUnofficialMessageSubmission>
{
  protected BASE_URL = 'https://x.com';

  private static readonly MAX_FILES_PER_TWEET = 4;

  private static readonly MAX_TWEET_LENGTH = 280;

  /** Validation runs often, so remote lookups (mentions, quoted posts) are cached */
  private static readonly LOOKUP_TTL_MS = 5 * 60 * 1000;

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
      rettiwt: new Rettiwt({ apiKey }),
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
  private static parseTweetId(url?: string): string | undefined {
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

  private static toMediaWarnings(
    blur?: ContentBlurValue,
  ): SensitiveMediaWarning[] | undefined {
    if (!blur) {
      return undefined;
    }
    return [blur === 'graphical_violence' ? 'graphic_violence' : blur];
  }

  /**
   * Splits text into chunks that each fit in one tweet.
   *
   * Intentionally makes no assumptions about the language: it only cuts at the
   * largest grapheme boundary where the chunk still fits, using Twitter's own
   * weighted length (so URLs, emoji, CJK etc. are counted like Twitter does).
   */
  private static splitText(text: string): string[] {
    const max = TwitterUnofficial.MAX_TWEET_LENGTH;
    const fits = (s: string) => parseTweet(s).weightedLength <= max;

    const segmenter = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    });
    let graphemes = Array.from(
      segmenter.segment(text.trim()),
      (s) => s.segment,
    );

    const chunks: string[] = [];
    while (graphemes.length) {
      // Binary search for the longest prefix that still fits
      let lo = 1;
      let hi = graphemes.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(graphemes.slice(0, mid).join(''))) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }

      const piece = graphemes.slice(0, lo).join('');
      if (piece.trim().length) {
        chunks.push(piece);
      }
      graphemes = graphemes.slice(lo);
    }

    return chunks.length ? chunks : [''];
  }

  private async uploadFile(
    session: RettiwtSession,
    file: PostingFile,
    options: Pick<ThreadOptions, 'contentBlur' | 'blockGrokEdit'>,
  ): Promise<string> {
    const { buffer } = file;
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    const id = await session.rettiwt.tweet.upload(arrayBuffer);
    if (!id) {
      throw new Error(`Failed to upload ${file.fileName ?? 'file'}`);
    }

    // Non-fatal: the post is still valid without the metadata
    try {
      await setMediaMetadata(session, id, {
        altText: file.metadata?.altText?.trim() || undefined,
        sensitiveMediaWarning: TwitterUnofficial.toMediaWarnings(
          options.contentBlur,
        ),
        blockGrokEdit: options.blockGrokEdit,
      });
    } catch (e) {
      this.logger.withError(e).warn(`Failed to set metadata for media ${id}`);
    }

    return id;
  }

  /**
   * Posts a thread. Tweet i carries text chunk i and file batch i (4 files max).
   * If there are more text chunks than file batches the remaining tweets are
   * text-only, and vice versa. The first tweet replies to / quotes the requested
   * post, every following tweet replies to the previous one.
   */
  private async postThread(
    options: ThreadOptions,
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    const session = await this.requireSession();
    const { rettiwt } = session;

    const fileBatches = chunk(
      options.files,
      TwitterUnofficial.MAX_FILES_PER_TWEET,
    );
    const total = Math.max(options.textChunks.length, fileBatches.length);
    const tweetIds: string[] = [];

    try {
      for (let i = 0; i < total; i++) {
        cancellationToken.throwIfAborted();

        const media: Array<{ id: string }> = [];
        for (const file of fileBatches[i] ?? []) {
          cancellationToken.throwIfAborted();
          media.push({ id: await this.uploadFile(session, file, options) });
        }

        const tweetId = await rettiwt.tweet.post({
          text: options.textChunks[i] ?? '',
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
          `Post failed${
            cleanupSuccess
              ? ''
              : ' and was unable to delete partially created tweets (manual cleanup needed)'
          }`,
        )
        .withAdditionalInfo({ tweetIds })
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
        // Length is enforced by validation, never split text on media posts
        textChunks: [options.description ?? ''],
        files,
        replyToId: TwitterUnofficial.parseTweetId(options.replyToUrl),
        quoteId: TwitterUnofficial.parseTweetId(options.quotePostUrl),
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
        textChunks: TwitterUnofficial.splitText(options.description ?? ''),
        files: [],
        replyToId: TwitterUnofficial.parseTweetId(options.replyToUrl),
        quoteId: TwitterUnofficial.parseTweetId(options.quotePostUrl),
      },
      cancellationToken,
    );
  }

  async onValidateMessageSubmission(
    postData: PostData<TwitterUnofficialMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator =
      this.createValidator<TwitterUnofficialMessageSubmission>();

    // No length limit: long text is split into a thread
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
      expires: Date.now() + TwitterUnofficial.LOOKUP_TTL_MS,
    });
    return value;
  }

  private validateDescriptionLength(
    postData: PostData<TwitterUnofficialFileSubmission>,
    validator: SubmissionValidator<TwitterUnofficialFileSubmission>,
  ): void {
    const { weightedLength } = parseTweet(postData.options.description ?? '');
    if (weightedLength > TwitterUnofficial.MAX_TWEET_LENGTH) {
      validator.error(
        'validation.description.max-length',
        {
          maxLength: TwitterUnofficial.MAX_TWEET_LENGTH,
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
    postData: PostData<
      TwitterUnofficialMessageSubmission | TwitterUnofficialFileSubmission
    >,
    validator:
      | SubmissionValidator<TwitterUnofficialMessageSubmission>
      | SubmissionValidator<TwitterUnofficialFileSubmission>,
  ): void {
    const url = postData.options.replyToUrl;
    if (url?.trim() && !TwitterUnofficial.parseTweetId(url)) {
      validator.error(
        'validation.replyurl.invalid-reply-url',
        { error: '' },
        'replyToUrl',
      );
    }
  }

  private async validateQuotePostUrl(
    postData: PostData<
      TwitterUnofficialMessageSubmission | TwitterUnofficialFileSubmission
    >,
    validator:
      | SubmissionValidator<TwitterUnofficialMessageSubmission>
      | SubmissionValidator<TwitterUnofficialFileSubmission>,
  ): Promise<void> {
    const url = postData.options.quotePostUrl;
    if (!url?.trim()) {
      return;
    }

    const tweetId = TwitterUnofficial.parseTweetId(url);
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
    postData: PostData<
      TwitterUnofficialMessageSubmission | TwitterUnofficialFileSubmission
    >,
    validator:
      | SubmissionValidator<TwitterUnofficialMessageSubmission>
      | SubmissionValidator<TwitterUnofficialFileSubmission>,
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
