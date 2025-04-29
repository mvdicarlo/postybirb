import { Http } from '@postybirb/http';
import {
  FileSubmissionMetadata,
  FileType,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { ItakuAccountData } from './models/itaku-account-data';
import { ItakuFileSubmission } from './models/itaku-file-submission';
import { ItakuMessageSubmission } from './models/itaku-message-submission';

@WebsiteMetadata({
  name: 'itaku',
  displayName: 'Itaku',
})
@UserLoginFlow('https://itaku.ee')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/mov',
  ],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.mbToBytes(10),
    [FileType.VIDEO]: FileSize.mbToBytes(500),
  },
  fileBatchSize: 100,
})
@SupportsUsernameShortcut({
  id: 'itaku',
  url: 'https://itaku.ee/profile/$1',
})
export default class Itaku
  extends Website<ItakuAccountData>
  implements
    FileWebsite<ItakuFileSubmission>,
    MessageWebsite<ItakuMessageSubmission>
{
  protected BASE_URL = 'https://itaku.ee';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<ItakuAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    if (this.account.name === 'test') {
      this.loginState.logout();
    }

    return this.loginState.setLogin(true, 'TestUser');
  }

  createFileModel(): ItakuFileSubmission {
    return new ItakuFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<ItakuFileSubmission>,
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
    postData: PostData<ItakuFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validations = {
      warnings: [],
      errors: [],
    };

    const { submission, options } = postData;
    if (!options.shareOnFeed) {
      const metadata = submission.metadata as FileSubmissionMetadata;
      const filesToPost = Object.values(metadata.fileMetadata).filter(
        ({ ignoredWebsites }) =>
          ignoredWebsites.length && !ignoredWebsites.includes(this.accountId),
      );

      if (filesToPost.length > 1) {
        validations.errors.push({
          id: 'validation.file.itaku.must-share-feed',
          field: 'files',
          values: {},
        });
      }
    }

    return validations;
  }

  createMessageModel(): ItakuMessageSubmission {
    return new ItakuMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<ItakuMessageSubmission>,
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

  onValidateMessageSubmission = validatorPassthru;
}
