import {
  ILoginState,
  ISubmissionFields,
  FileSubmission,
  MessageSubmission,
  PostData,
  ValidationResult,
} from '@postybirb/types';
import { TestMetadata } from '@postybirb/website-metadata';
import { Class } from 'type-fest';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import { TestFileSubmission } from './models/test-file-submission';
import { TestMessageSubmission } from './models/test-message-submission';

@WebsiteMetadata(TestMetadata)
@UserLoginFlow('https://furaffinity.net')
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

  supportsFile = true as const;

  supportsMessage = true as const;

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

  onPostFileSubmission(
    postData: PostData<FileSubmission, ISubmissionFields>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateFileSubmission(
    postData: PostData<FileSubmission, TestFileSubmission>
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
  }

  onPostMessageSubmission(
    postData: PostData<MessageSubmission, TestMessageSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateMessageSubmission(
    postData: PostData<MessageSubmission, TestMessageSubmission>
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
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
