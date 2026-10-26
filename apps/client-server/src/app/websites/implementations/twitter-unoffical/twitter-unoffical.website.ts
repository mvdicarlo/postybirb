import { Http } from '@postybirb/http';
import {
  ImageResizeProps,
  ISubmissionFile,
  LoginResult,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite, PostBatchData } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { TwitterUnofficalAccountData } from './models/twitter-unoffical-account-data';
import { TwitterUnofficalFileSubmission } from './models/twitter-unoffical-file-submission';
import { TwitterUnofficalMessageSubmission } from './models/twitter-unoffical-message-submission';

@WebsiteMetadata({
  name: 'twitter-unoffical',
  displayName: 'twitter-unoffical',
})
@UserLoginFlow('https://x.com/')
@SupportsFiles(['image/png', 'image/jpeg'])
export default class TwitterUnoffical extends Website<TwitterUnofficalAccountData> implements
  FileWebsite<TwitterUnofficalFileSubmission>,
  MessageWebsite<TwitterUnofficalMessageSubmission>
{
  protected BASE_URL = 'https://x.com/';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TwitterUnofficalAccountData> =
    {
      folders: true
    };

  protected async onLogin(): Promise<LoginResult> {
    if (this.account.name === 'test') {
      return { loggedIn: false };
    }

    return { loggedIn: true, username: 'TestUser' };
  }

  createFileModel(): TwitterUnofficalFileSubmission {
    return new TwitterUnofficalFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<TwitterUnofficalFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
    batch: PostBatchData
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
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
    postData: PostData<TwitterUnofficalFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TwitterUnofficalFileSubmission>();

    return validator.result;
  }

  createMessageModel(): TwitterUnofficalMessageSubmission {
    return new TwitterUnofficalMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<TwitterUnofficalMessageSubmission>,
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
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
    postData: PostData<TwitterUnofficalMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<TwitterUnofficalMessageSubmission>();

    return validator.result;
  }
}