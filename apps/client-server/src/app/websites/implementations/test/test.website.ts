import {
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  IWebsiteFormFields,
  IWebsiteMetadata,
  OAuthRouteHandlers,
  OAuthRoutes,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { wait } from '../../../utils/wait.util';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import { TestFileSubmission } from './models/test-file-submission';
import { TestMessageSubmission } from './models/test-message-submission';

export const TestMetadata: IWebsiteMetadata = {
  name: 'test',
  displayName: 'Test',
};

@WebsiteMetadata(TestMetadata)
@UserLoginFlow('https://patreon.com')
@SupportsFiles(['image/png', 'image/jpeg', 'text/plain'])
export default class TestWebsite
  extends Website<{ test: string }>
  implements
    FileWebsite<TestFileSubmission>,
    MessageWebsite<TestMessageSubmission>,
    OAuthWebsite<OAuthRoutes>
{
  public externallyAccessibleWebsiteDataProperties: { test: boolean } = {
    test: true,
  };

  protected BASE_URL = 'http://localhost:3000';

  public async onLogin(): Promise<ILoginState> {
    if (this.account.id === 'FAIL') {
      this.loginState.logout();
    }

    // await wait(5_000);
    await this.websiteDataStore.setData({ test: 'test-mode' });
    return this.loginState.setLogin(true, 'TestUser');
  }

  createFileModel(): TestFileSubmission {
    return new TestFileSubmission();
  }

  createMessageModel(): TestMessageSubmission {
    return new TestMessageSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<IWebsiteFormFields>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    cancellationToken.throwIfCancelled();
    return PostResponse.fromWebsite(this)
      .atStage('test')
      .withMessage('test message');
  }

  async onValidateFileSubmission(
    postData: PostData<TestFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  async onPostMessageSubmission(
    postData: PostData<TestMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    cancellationToken.throwIfCancelled();
    if (this.account.name === 'FAIL') {
      return PostResponse.fromWebsite(this)
        .atStage('validation')
        .withMessage('Forced failure for testing purposes.')
        .withException(new Error('Forced failure'));
    }

    if (this.account.name === 'SUCCESS') {
      await wait(15_000);
      return PostResponse.fromWebsite(this)
        .atStage('validation')
        .withMessage('Forced success for testing purposes.')
        .withSourceUrl('http://example.com/success');
    }

    return PostResponse.fromWebsite(this)
      .atStage('test')
      .withMessage('test message');
  }

  async onValidateMessageSubmission(
    postData: PostData<TestMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const results: SimpleValidationResult = {
      warnings: [],
      errors: [],
    };
    return results;
  }

  onAuthRoute: OAuthRouteHandlers<OAuthRoutes> = {
    authorize: (request) => ({ result: true }),
  };
}
