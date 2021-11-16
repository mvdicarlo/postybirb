import { TestMetadata } from '@postybirb/website-metadata';
import BaseWebsiteOptions from '../../../submission/models/base-website-options.model';
import FileSubmission from '../../../submission/models/file-submission.model';
import FileWebsiteOptions from '../../../submission/models/file-website-options.model';
import messageSubmissionModel from '../../../submission/models/message-submission.model';
import PostData from '../../../submission/models/post-data.model';
import { FileWebsite } from '../../models/file-website.interface';
import { ILoginState } from '../../models/login-state.interface';
import { MessageWebsite } from '../../models/message-website.interface';
import { OAuthWebsite } from '../../models/oauth-website.interface';
import { Website } from '../../website';
import { WebsiteMetadata } from '../../website-metadata.decorator';
import { Class } from 'type-fest';
class FileModel implements FileWebsiteOptions {
  useThumbnail = true;
  allowResize = true;
  title?: string;
  tags: unknown;
  description: unknown;
  rating: unknown;
}

class MessageModel implements BaseWebsiteOptions {
  title?: string;
  tags: unknown;
  description: unknown;
  rating: unknown;
}

@WebsiteMetadata(TestMetadata)
export default class TestWebsite
  extends Website<{ test: string }>
  implements FileWebsite<FileModel>, MessageWebsite<MessageModel>, OAuthWebsite
{
  fileModel: Class<FileModel> = FileModel;
  messageModel: Class<MessageModel> = MessageModel;
  supportsAdditionalFiles = false;
  supportsFile: true = true;
  supportsMessage: true = true;

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

  createFileModel(): FileModel {
    return new this.fileModel();
  }

  createMessageModel(): MessageModel {
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
    postData: PostData<FileModel>
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onPostMessageSubmission(
    postData: PostData<MessageModel>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateMessageSubmission(
    submissionData: messageSubmissionModel,
    postData: PostData<MessageModel>
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
