import { Http } from '@postybirb/http';
import {
  DescriptionType,
  FileSubmission,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  MessageSubmission,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsDescription } from '../../decorators/supports-description.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsTags } from '../../decorators/supports-tags.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { FooAccountData } from './models/foo-account-data';
import { FooFileSubmission } from './models/foo-file-submission';

@WebsiteMetadata({
  name: 'foo',
  displayName: 'Foo',
})
@UserLoginFlow('https://foo.net/login')
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg'], // Limits to only these mime types
  fileBatchSize: 2,
})
@SupportsDescription(DescriptionType.HTML)
@SupportsTags()
@DisableAds()
export default class Foo
  extends Website<FooAccountData>
  implements FileWebsite<FooFileSubmission>, MessageWebsite<FooFileSubmission>
{
  protected BASE_URL = 'https://foo.net';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FooAccountData> =
    {
      nonSensitiveProperty: true,
      sensitiveProperty: false,
    };

  public async onLogin(): Promise<ILoginState> {
    if (this.account.name === 'test') {
      this.loginState.logout();
    }

    await this.websiteDataStore.setData({
      sensitiveProperty: '<SECRET-API-KEY>',
      nonSensitiveProperty: ['folder1', 'folder2'],
    });
    return this.loginState.setLogin(true, 'TestUser');
  }

  createFileModel(): FooFileSubmission {
    return new FooFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<FileSubmission, FooFileSubmission>,
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
      return { additionalInfo: null };
    }
    return {
      additionalInfo: {
        body: result.body,
        statusCode: result.statusCode,
      },
      exception: new Error('Failed to post'),
    };
  }

  async onValidateFileSubmission(
    postData: PostData<FileSubmission, FooFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  createMessageModel(): FooFileSubmission {
    throw new Error('Method not implemented.');
  }

  async onPostMessageSubmission(
    postData: PostData<MessageSubmission, FooFileSubmission>,
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
      return { additionalInfo: null };
    }
    return {
      additionalInfo: {
        body: result.body,
        statusCode: result.statusCode,
      },
      exception: new Error('Failed to post'),
    };
  }

  onValidateMessageSubmission(
    postData: PostData<MessageSubmission, FooFileSubmission>,
  ): Promise<SimpleValidationResult> {
    throw new Error('Method not implemented.');
  }
}
