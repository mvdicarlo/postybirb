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
import { TwitterUnofficialFileSubmission } from './models/twitter-unofficial-file-submission';
import { TwitterUnofficialMessageSubmission } from './models/twitter-unofficial-message-submission';

type RettiwtSession = {
  rettiwt: Rettiwt;
  userId: string;
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

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TwitterUnofficialAccountData> =
    {
      userName: true,
    };

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
    const userId = decodeURIComponent(twid).replace(/^u=/, '').replace(/"/g, '');
    if (!userId) {
      return undefined;
    }

    const apiKey = Buffer.from(
      `auth_token=${authToken};ct0=${ct0};twid=${twid};`,
    ).toString('base64');

    return { rettiwt: new Rettiwt({ apiKey }), userId };
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

  private buildUrl(tweetId?: string): string | undefined {
    if (!tweetId) {
      return undefined;
    }
    const { userName } = this.getWebsiteData();
    return userName
      ? `https://x.com/${userName}/status/${tweetId}`
      : `https://x.com/i/web/status/${tweetId}`;
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

  private async uploadFile(
    rettiwt: Rettiwt,
    file: PostingFile,
  ): Promise<{ id: string; altText?: string }> {
    const { buffer } = file;
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    const id = await rettiwt.tweet.upload(arrayBuffer);
    if (!id) {
      throw new Error(`Failed to upload ${file.fileName ?? 'file'}`);
    }

    const altText = file.metadata?.altText?.trim();
    return altText ? { id, altText } : { id };
  }

  async onPostFileSubmission(
    postData: PostData<TwitterUnofficialFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
    const { rettiwt } = await this.requireSession();

    const text = postData.options.description ?? '';
    const partitions = chunk(files, TwitterUnofficial.MAX_FILES_PER_TWEET);
    const tweetIds: string[] = [];

    try {
      for (const partition of partitions) {
        cancellationToken.throwIfAborted();

        const media: Array<{ id: string; altText?: string }> = [];
        for (const file of partition) {
          cancellationToken.throwIfAborted();
          media.push(await this.uploadFile(rettiwt, file));
        }

        const replyTo = tweetIds.length ? tweetIds[tweetIds.length - 1] : undefined;
        const tweetId = await rettiwt.tweet.post({
          // Only the first tweet carries the text, replies would duplicate it
          text: replyTo ? '' : text,
          media,
          replyTo,
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

  async onValidateFileSubmission(
    postData: PostData<TwitterUnofficialFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return this.validateDescription<TwitterUnofficialFileSubmission>(postData);
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
    const { rettiwt } = await this.requireSession();

    try {
      const tweetId = await rettiwt.tweet.post({
        text: postData.options.description ?? '',
      });

      if (!tweetId) {
        throw new Error('Twitter did not return a tweet id');
      }

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({ tweetId })
        .withSourceUrl(this.buildUrl(tweetId));
    } catch (err) {
      return PostResponse.fromWebsite(this).withException(
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  async onValidateMessageSubmission(
    postData: PostData<TwitterUnofficialMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    return this.validateDescription<TwitterUnofficialMessageSubmission>(
      postData,
    );
  }

  // ---------------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------------

  private validateDescription<
    T extends TwitterUnofficialMessageSubmission,
  >(postData: PostData<T>): SimpleValidationResult {
    const validator = this.createValidator<TwitterUnofficialMessageSubmission>();

    const parsed = parseTweet(postData.options.description ?? '');
    if (parsed.weightedLength > TwitterUnofficial.MAX_TWEET_LENGTH) {
      validator.warning(
        'validation.description.max-length',
        {
          currentLength: parsed.weightedLength,
          maxLength: TwitterUnofficial.MAX_TWEET_LENGTH,
        },
        'description',
      );
    }

    return validator.result;
  }
}