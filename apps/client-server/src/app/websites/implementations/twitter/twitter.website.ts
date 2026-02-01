import {
    FileType,
    ILoginState,
    ImageResizeProps,
    ISubmissionFile,
    OAuthRouteHandlers,
    PostData,
    PostResponse,
    SimpleValidationResult,
    TwitterAccountData,
    TwitterOAuthRoutes,
} from '@postybirb/types';
import { chunk } from 'lodash';
import { parseTweet } from 'twitter-text';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { TwitterFileSubmission } from './models/twitter-file-submission';
import { TwitterMessageSubmission } from './models/twitter-message-submission';
import {
    TweetResultMeta,
    TwitterApiServiceV2,
} from './twitter-api-service/twitter-api-service';

@WebsiteMetadata({
  name: 'twitter',
  displayName: 'Twitter / X',
})
@CustomLoginFlow()
@SupportsUsernameShortcut({
  id: 'twitter',
  url: 'https://x.com/$1',
  convert: (websiteName, shortcut) => {
    if (websiteName === 'twitter' && shortcut === 'twitter') {
      return '@$1';
    }

    return undefined;
  },
})
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
})
@DisableAds()
@DisableAds()
export default class Twitter
  extends Website<TwitterAccountData>
  implements
    FileWebsite<TwitterFileSubmission>,
    MessageWebsite<TwitterMessageSubmission>
{
  protected BASE_URL = '';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TwitterAccountData> =
    {
      apiKey: true,
      apiSecret: true,
    };

  // OAuth step handlers invoked via websitesApi.performOAuthStep
  public onAuthRoute: OAuthRouteHandlers<TwitterOAuthRoutes> = {
    setApiKeys: async ({ apiKey, apiSecret }) => {
      const current = this.websiteDataStore.getData();
      await this.setWebsiteData({
        ...(current as TwitterAccountData),
        apiKey,
        apiSecret,
      });
      return { success: true };
    },
    requestToken: async () => {
      const { apiKey, apiSecret } = this.websiteDataStore.getData();
      if (!apiKey || !apiSecret) {
        return {
          success: false,
          message: 'API key and secret must be set before requesting token',
        };
      }

      try {
        const auth = await TwitterApiServiceV2.generateAuthLink(
          apiKey,
          apiSecret,
        );
        const current = this.websiteDataStore.getData();
        await this.setWebsiteData({
          ...(current as TwitterAccountData),
          requestToken: auth.oauthToken,
          requestTokenSecret: auth.oauthTokenSecret,
        });
        return {
          success: true,
          url: auth.url,
          oauthToken: auth.oauthToken,
        };
      } catch (e) {
        this.logger.error(e);
        return { success: false, message: 'Failed to get request token' };
      }
    },
    completeOAuth: async ({ verifier }) => {
      const { requestToken, requestTokenSecret, apiKey, apiSecret } =
        this.websiteDataStore.getData();
      if (!requestToken || !requestTokenSecret) {
        return { success: false, message: 'No pending request token' };
      }
      if (!verifier) {
        return { success: false, message: 'Verifier required' };
      }
      if (!apiKey || !apiSecret) {
        return { success: false, message: 'API credentials missing' };
      }

      try {
        const result = await TwitterApiServiceV2.login(
          apiKey,
          apiSecret,
          requestToken,
          requestTokenSecret,
          verifier,
        );
        const current = this.websiteDataStore.getData();
        await this.setWebsiteData({
          ...(current as TwitterAccountData),
          accessToken: result.accessToken,
          accessTokenSecret: result.accessTokenSecret,
          screenName: result.screenName,
          userId: result.userId,
          requestToken: undefined,
          requestTokenSecret: undefined,
        });
        await this.onLogin();
        return {
          success: true,
          screenName: result.screenName,
          userId: result.userId,
        };
      } catch (e) {
        this.logger.error(e);
        return { success: false, message: 'Failed to complete OAuth' };
      }
    },
  };

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();
    if (data?.accessToken && data?.accessTokenSecret && data?.screenName) {
      return this.loginState.setLogin(true, data.screenName);
    }
    return this.loginState.logout();
  }

  createFileModel(): TwitterFileSubmission {
    return new TwitterFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<TwitterFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const filePartitions = chunk(files, 4);
    const { accessToken, accessTokenSecret, apiKey, apiSecret } =
      this.getWebsiteData();
    const results: TweetResultMeta[] = [];
    for (const partition of filePartitions) {
      const result = await TwitterApiServiceV2.postMedia(
        { apiKey, apiSecret, accessToken, accessTokenSecret },
        partition,
        postData,
        results.length > 0 ? results[results.length - 1].id : undefined,
      );

      if (!result.success || cancellationToken.isCancelled) {
        const cleanupSuccess = await this.cleanUpFailedPost(
          results,
          apiKey,
          apiSecret,
          accessToken,
          accessTokenSecret,
        );
        return PostResponse.fromWebsite(this)
          .withMessage(
            `Post failed${cleanupSuccess ? '' : ' and was unable to delete partially created tweets (manual cleanup needed)'}`,
          )
          .withAdditionalInfo(result)
          .withException(new Error(result.error || 'Failed to post'));
      }

      results.push(result);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo(results)
      .withSourceUrl(results[0]?.url);
  }

  private async cleanUpFailedPost(
    results: TweetResultMeta[],
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string,
  ) {
    if (results.length > 1) {
      try {
        const deleteResult = await TwitterApiServiceV2.deleteFailedReplyChain(
          { apiKey, apiSecret, accessToken, accessTokenSecret },
          results.map((r) => r.id).filter((id) => !!id) as string[],
        );

        if (deleteResult.errors.length > 0) {
          this.logger
            .withMetadata(deleteResult.errors)
            .warn('Some tweets could not be deleted');
        }

        if (deleteResult.deletedIds.length > 0) {
          this.logger.info(
            `Cleaned up ${deleteResult.deletedIds.length} tweets from failed thread`,
          );
        }
      } catch (err) {
        this.logger.error('Failed to cleanup failed reply chain:', err);
        return false;
      }
    }

    return true;
  }

  async onValidateFileSubmission(
    postData: PostData<TwitterFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TwitterFileSubmission>();

    const parsed = parseTweet(postData.options.description ?? '');
    if (parsed.weightedLength > 280) {
      validator.warning(
        'validation.description.max-length',
        {
          currentLength: parsed.weightedLength,
          maxLength: 280,
        },
        'description',
      );
    }
    return validator.result;
  }

  createMessageModel(): TwitterMessageSubmission {
    return new TwitterMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<TwitterMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const { accessToken, accessTokenSecret, apiKey, apiSecret } =
      this.getWebsiteData();

    const result = await TwitterApiServiceV2.postStatus(
      {
        accessToken,
        accessTokenSecret,
        apiKey,
        apiSecret,
      },
      postData,
      undefined,
    );

    if (!result.success) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(result)
        .withException(new Error(result.error || 'Failed to post'));
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo(result)
      .withSourceUrl(result.url);
  }

  async onValidateMessageSubmission(
    postData: PostData<TwitterMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TwitterMessageSubmission>();

    const parsed = parseTweet(postData.options.description ?? '');
    if (parsed.weightedLength > 280) {
      validator.warning(
        'validation.description.max-length',
        {
          currentLength: parsed.weightedLength,
          maxLength: 280,
        },
        'description',
      );
    }
    return validator.result;
  }
}
