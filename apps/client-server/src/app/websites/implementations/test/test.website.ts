import {
  FileSubmission,
  ILoginState,
  ISubmissionFile,
  IWebsiteFormFields,
  IWebsiteMetadata,
  MessageSubmission,
  PostData,
  PostResponse,
  ValidationResult,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { ImageResizeProps } from '../../../post/models/image-resize-props';
import { PostingFile } from '../../../post/models/posting-file';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsTags } from '../../decorators/supports-tags.decorator';
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
@UserLoginFlow('https://furaffinity.net')
@SupportsTags()
export default class TestWebsite
  extends Website<{ test: string }>
  implements
    FileWebsite<TestFileSubmission>,
    MessageWebsite<TestMessageSubmission>,
    OAuthWebsite
{
  FileModel: Class<TestFileSubmission> = TestFileSubmission;

  MessageModel: Class<TestMessageSubmission> = TestMessageSubmission;

  supportsAdditionalFiles = false;

  public externallyAccessibleWebsiteDataProperties: { test: boolean } = {
    test: true,
  };

  protected BASE_URL = 'http://localhost:3000';

  public async onLogin(): Promise<ILoginState> {
    if (this.account.id === 'FAIL') {
      this.loginState.logout();
    }

    await this.websiteDataStore.setData({ test: 'test-mode' });
    return this.loginState.setLogin(true, 'TestUser');
  }

  createFileModel(): TestFileSubmission {
    return new this.FileModel();
  }

  createMessageModel(): TestMessageSubmission {
    return new this.MessageModel();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    throw new Error('Method not implemented.');
  }

  onPostFileSubmission(
    postData: PostData<FileSubmission, IWebsiteFormFields>,
    files: PostingFile[],
    cancellationToken: CancellableToken
  ): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateFileSubmission(
    postData: PostData<FileSubmission, TestFileSubmission>
  ): Promise<ValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  onPostMessageSubmission(
    postData: PostData<MessageSubmission, TestMessageSubmission>,
    cancellationToken: CancellableToken
  ): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateMessageSubmission(
    postData: PostData<MessageSubmission, TestMessageSubmission>
  ): Promise<ValidationResult> {
    const results: ValidationResult = {
      warnings: [],
      errors: [],
    };
    return results;
  }

  async onAuthorize(
    data: Record<string, unknown>,
    state: string
  ): Promise<Record<string, boolean>> {
    if (state === 'authorize') {
      return { result: true };
    }

    return { result: false };
  }
}
