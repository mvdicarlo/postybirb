import { TestMetadata } from '@postybirb/website-metadata';
import BaseWebsiteOptions from '../../../submission/models_maybe/base-website-options.model';
import FileSubmission from '../../../submission/models_maybe/file-submission.model';
import FileWebsiteOptions from '../../../submission/models_maybe/file-website-options.model';
import messageSubmissionModel from '../../../submission/models_maybe/message-submission.model';
import PostData from '../../../submission/models_maybe/post-data.model';
import { FileWebsite } from '../../models/website-modifier-interfaces/file-website.interface';
import { ILoginState } from '../../models/login-state.interface';
import { MessageWebsite } from '../../models/website-modifier-interfaces/message-website.interface';
import { OAuthWebsite } from '../../models/website-modifier-interfaces/oauth-website.interface';
import { Website } from '../../website';
import { WebsiteMetadata } from '../../website-metadata.decorator';
import { Class } from 'type-fest';
import { TestFileSubmission } from './models/test-file-submission.model';
import { TestMessageSubmission } from './models/test-message-submission.model';
import { UserLoginWebsite } from '../../models/website-modifier-interfaces/user-login-website.interface';

@WebsiteMetadata(TestMetadata)
export default class TestWebsite
  extends Website<{ test: string }>
  implements
    FileWebsite<TestFileSubmission>,
    MessageWebsite<TestMessageSubmission>,
    OAuthWebsite,
    UserLoginWebsite
{
  fileModel: Class<TestFileSubmission> = TestFileSubmission;
  messageModel: Class<TestMessageSubmission> = TestMessageSubmission;
  supportsAdditionalFiles = false;
  supportsFile: true = true;
  supportsMessage: true = true;

  public externallyAccessibleWebsiteDataProperties: { test: boolean } = {
    test: true,
  };

  protected BASE_URL = 'http://localhost:3000';
  loginUrl: string = `${this.BASE_URL}/login`;

  public async onLogin(): Promise<ILoginState> {
    if (this.account.id === 'FAIL') {
      this.loginState.logout();
    }

    await this.websiteDataStore.setData({ test: 'test-mode' });
    return this.loginState.setLogin(true, 'TestUser');
  }

  createFileModel(): TestFileSubmission {
    return new this.fileModel();
  }

  createMessageModel(): TestMessageSubmission {
    return new this.messageModel();
  }

  onPostFileSubmission(
    postData: PostData<FileWebsiteOptions>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateFileSubmission(
    submissionData: FileSubmission,
    postData: PostData<TestFileSubmission>
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onPostMessageSubmission(
    postData: PostData<TestMessageSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateMessageSubmission(
    submissionData: messageSubmissionModel,
    postData: PostData<TestMessageSubmission>
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  async onAuthorize(
    data: Record<string, unknown>,
    state: string
  ): Promise<any> {
    if (state === 'authorize') {
      return true;
    }

    return false;
  }
}
