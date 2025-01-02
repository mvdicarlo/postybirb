/* eslint-disable max-classes-per-file */
import {
  FileSubmission,
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
export default class Foo
  extends Website<FooAccountData>
  implements FileWebsite<FooFileSubmission>
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

  onPostFileSubmission(
    postData: PostData<FileSubmission, FooFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateFileSubmission(
    postData: PostData<FileSubmission, FooFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }
}
