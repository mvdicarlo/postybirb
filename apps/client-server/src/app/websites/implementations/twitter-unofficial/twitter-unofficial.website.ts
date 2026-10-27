import {
  FileType,
  ImageResizeProps,
  ISubmissionFile,
  LoginResult,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { chunk } from 'lodash';
import { Rettiwt } from 'rettiwt-api';
import { parseTweet } from 'twitter-text';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import FileSize from '../../../utils/filesize.util';
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

type RettiwtSession = {
  rettiwt: Rettiwt;
  userId: string;
  /** Raw cookie header + csrf token, used for the few calls Rettiwt lacks */
  cookieHeader: string;
  ct0: string;
};

type ThreadOptions = {
  text: string;
  files: PostingFile[];
  replyToId?: string;
  quoteId?: string;
  contentBlur?: ContentBlurValue;
};

/**
 * Public web-client bearer token (the same one x.com itself and Rettiwt use).
 */
const WEB_BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

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

    const cookieHeader = `auth_token=${authToken}; ct0=${ct0}; twid=${twid}`;
    const apiKey = Buffer.from(
      `auth_token=${authToken};ct0=${ct0};twid=${twid};`,
    ).toString('base64');

    return { rettiwt: new Rettiwt({ apiKey }), userId, cookieHeader, ct0 };
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

  private static normalizeBlur(
    blur?: ContentBlurValue,
  ): 'other' | 'adult_content' | 'graphic_violence' | undefined {
    if (!blur) {
      return undefined;
    }
    return blur === 'graphical_violence' ? 'graphic_violence' : blur;
  }

  /**
   * Splits text into chunks that each fit in a single tweet (weighted length,
   * so URLs / emoji / CJK are counted the way Twitter counts them).
   * Prefers paragraph, line, sentence, then word boundaries.
   */
  private static splitText(
    text: string,
    max = TwitterUnofficial.MAX_TWEET_LENGTH,
  ): string[] {
    const fits = (s: string) => parseTweet(s).weightedLength <= max;

    const chunks: string[] = [];
    let remaining = text.trim();

    while (remaining.length) {
      if (fits(remaining)) {
        chunks.push(remaining);
        break;
      }

      // Largest prefix (in code points) that still fits
      const chars = Array.from(remaining);
      let lo = 1;
      let hi = chars.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(chars.slice(0, mid).join(''))) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }
      const prefix = chars.slice(0, lo).join('');

      // Don't break too early: only accept boundaries in the last half
      const minIndex = Math.floor(prefix.length / 2);
      const boundaries: RegExp[] = [
        /\n\s*\n/g, // paragraph
        /\n/g, // line
        /[.!?…。！？]["')\]]*\s/g, // sentence
        /\s/g, // word
      ];

      let cut = -1;
      for (const re of boundaries) {
        let match: RegExpExecArray | null;
        let last = -1;
        // eslint-disable-next-line no-cond-assign
        while ((match = re.exec(prefix)) !== null) {
          const end = match.index + match[0].length;
          if (end >= minIndex) {
            last = end;
          }
        }
        if (last > 0) {
          cut = last;
          break;
        }
      }

      if (cut <= 0) {
        cut = prefix.length; // No good boundary, hard cut
      }

      const piece = remaining.slice(0, cut).trim();
      if (piece.length) {
        chunks.push(piece);
      }
      remaining = remaining.slice(cut).trim();
    }

    return chunks.length ? chunks : [''];
  }

  /**
   * Alt text and sensitive-media flags are not exposed by Rettiwt, so they are
   * applied with a direct call using the same session cookies. Non-fatal.
   */
  private async setMediaMetadata(
    session: RettiwtSession,
    mediaId: string,
    altText?: string,
    contentBlur?: ReturnType<typeof TwitterUnofficial.normalizeBlur>,
  ): Promise<void> {
    if (!altText && !contentBlur) {
      return;
    }

    const body: Record<string, unknown> = { media_id: mediaId };
    if (altText) {
      body.alt_text = { text: altText };
    }
    if (contentBlur) {
      body.sensitive_media_warning = [contentBlur];
    }

    try {
      const res = await fetch(
        'https://x.com/i/api/1.1/media/metadata/create.json',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${WEB_BEARER_TOKEN}`,
            'content-type': 'application/json',
            cookie: session.cookieHeader,
            'x-csrf-token': session.ct0,
            'x-twitter-auth-type': 'OAuth2Session',
            'x-twitter-active-user': 'yes',
            'x-twitter-client-language': 'en',
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        this.logger.warn(
          `Failed to set metadata for media ${mediaId}: HTTP ${res.status}`,
        );
      }
    } catch (e) {
      this.logger
        .withError(e)
        .warn(`Failed to set metadata for media ${mediaId}`);
    }
  }

  private async uploadFile(
    session: RettiwtSession,
    file: PostingFile,
    contentBlur?: ContentBlurValue,
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

    await this.setMediaMetadata(
      session,
      id,
      file.metadata?.altText?.trim() || undefined,
      TwitterUnofficial.normalizeBlur(contentBlur),
    );

    return id;
  }

  /**
   * Posts text and files as a thread.
   *
   * Tweet i carries text chunk i and file batch i (4 files max). If there are
   * more text chunks than file batches the remaining tweets are text-only, and
   * vice versa. The first tweet replies to / quotes the requested post, every
   * following tweet replies to the previous one.
   */
  private async postThread(
    options: ThreadOptions,
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    const session = await this.requireSession();
    const { rettiwt } = session;

    const textChunks = TwitterUnofficial.splitText(options.text);
    const fileBatches = chunk(
      options.files,
      TwitterUnofficial.MAX_FILES_PER_TWEET,
    );
    const total = Math.max(textChunks.length, fileBatches.length);
    const tweetIds: string[] = [];

    try {
      for (let i = 0; i < total; i++) {
        cancellationToken.throwIfAborted();

        const media: Array<{ id: string }> = [];
        for (const file of fileBatches[i] ?? []) {
          cancellationToken.throwIfAborted();
          media.push({
            id: await this.uploadFile(session, file, options.contentBlur),
          });
        }

        const tweetId = await rettiwt.tweet.post({
          text: textChunks[i] ?? '',
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
        text: options.description ?? '',
        files,
        replyToId: TwitterUnofficial.parseTweetId(options.replyToUrl),
        quoteId: TwitterUnofficial.parseTweetId(options.quotePostUrl),
        contentBlur: options.contentBlur,
      },
      cancellationToken,
    );
  }

  async onValidateFileSubmission(
    postData: PostData<TwitterUnofficialFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return this.validateLinks<TwitterUnofficialFileSubmission>(postData);
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
        replyToId: TwitterUnofficial.parseTweetId(options.replyToUrl),
        quoteId: TwitterUnofficial.parseTweetId(options.quotePostUrl),
      },
      cancellationToken,
    );
  }

  async onValidateMessageSubmission(
    postData: PostData<TwitterUnofficialMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    return this.validateLinks<TwitterUnofficialMessageSubmission>(postData);
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  private validateLinks<T extends TwitterUnofficialMessageSubmission>(
    postData: PostData<T>,
  ): SimpleValidationResult {
    const validator = this.createValidator<T>();
    const { replyToUrl, quotePostUrl } = postData.options;

    if (replyToUrl?.trim() && !TwitterUnofficial.parseTweetId(replyToUrl)) {
      validator.error('validation.url.invalid', {}, 'replyToUrl');
    }

    if (quotePostUrl?.trim() && !TwitterUnofficial.parseTweetId(quotePostUrl)) {
      validator.error('validation.url.invalid', {}, 'quotePostUrl');
    }

    return validator.result;
  }
}
