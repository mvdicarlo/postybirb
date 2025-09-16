import { Http } from '@postybirb/http';
import {
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
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
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
import { TwitterApiServiceV2 } from './twitter-api-service/twitter-api-service';

@WebsiteMetadata({
  name: 'twitter',
  displayName: 'Twitter / X',
})
@CustomLoginFlow()
@SupportsUsernameShortcut({
  id: 'twitter',
  url: 'https://x.com/$1',
})
@SupportsFiles([
  'image/png',
  'image/jpeg',
  'image/gif',
  'video/mp4',
  'video/mov',
  'image/webp',
])
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
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const formData = {
      file: files[0].toPostFormat(),
      thumb: files[0].thumbnailToPostFormat(),
      description: postData.options.description,
      tags: postData.options.tags.join(', '),
      title: postData.options.title,
      rating: postData.options.rating,
    };

    const result = await Http.post<string>(`${this.BASE_URL}/submit`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
    });

    if (result.statusCode === 200) {
      return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateFileSubmission(
    postData: PostData<TwitterFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TwitterFileSubmission>();

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
    const formData = {
      description: postData.options.description,
      tags: postData.options.tags.join(', '),
      title: postData.options.title,
      rating: postData.options.rating,
    };

    const result = await Http.post<string>(`${this.BASE_URL}/submit`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
    });

    if (result.statusCode === 200) {
      return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  async onValidateMessageSubmission(
    postData: PostData<TwitterMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TwitterMessageSubmission>();

    return validator.result;
  }
}
