import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { AryionAccountData } from './models/aryion-account-data';
import { AryionFileSubmission } from './models/aryion-file-submission';

@WebsiteMetadata({
  name: 'aryion',
  displayName: 'aryion',
})
@UserLoginFlow('https://aryion.com')
@SupportsFiles(['image/png', 'image/jpeg'])
export default class Aryion extends Website<AryionAccountData> implements
  FileWebsite<AryionFileSubmission>
{
  protected BASE_URL = 'https://aryion.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<AryionAccountData> =
    {
      folders: true
    };

  public async onLogin(): Promise<ILoginState> {
    if (this.account.name === 'test') {
      this.loginState.logout();
    }

    return this.loginState.setLogin(true, 'TestUser');
  }

  createFileModel(): AryionFileSubmission {
    return new AryionFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<AryionFileSubmission>,
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
    postData: PostData<AryionFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<AryionFileSubmission>();

    return validator.result;
  }

}