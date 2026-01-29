import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { app } from 'electron';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { FurtasticAccountData } from './models/furtastic-account-data';
import { FurtasticFileSubmission } from './models/furtastic-file-submission';

@WebsiteMetadata({
  name: 'furtastic',
  displayName: 'Furtastic',
})
@CustomLoginFlow()
@SupportsFiles({
  fileBatchSize: 100, // Unknown limit
  acceptedFileSizes: {
    '*': FileSize.megabytes(100),
  },
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/webm',
    'text/pdf',
    'application/pdf',
  ],
})
@SupportsUsernameShortcut({
  id: 'furtastic',
  url: 'https://furtastic.art/profile/$1',
})
export default class Furtastic
  extends Website<FurtasticAccountData>
  implements FileWebsite<FurtasticFileSubmission>
{
  protected BASE_URL = 'https://api.furtastic.art';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FurtasticAccountData> =
    {
      username: true,
      key: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const data = this.getWebsiteData();
    if (data.username && data.key) {
      return this.loginState.setLogin(true, data.username);
    }

    return this.loginState.setLogin(false, null);
  }

  createFileModel(): FurtasticFileSubmission {
    return new FurtasticFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  private getRating(rating: SubmissionRating) {
    switch (rating) {
      case SubmissionRating.MATURE:
        return 'nsfw';
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return 'nsfw';
      case SubmissionRating.GENERAL:
      default:
        return 'safe';
    }
  }

  async onPostFileSubmission(
    postData: PostData<FurtasticFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const accountData = this.getWebsiteData();
    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .withHeaders({
        'User-Agent': Http.getUserAgent(app.getVersion()),
        'x-api-user': accountData.username,
        'x-api-key': accountData.key,
      })
      .setField('title', postData.options.title)
      .setField('description', postData.options.description)
      .setField('tags', postData.options.tags.join(' ').trim())
      .setField('rating', this.getRating(postData.options.rating))
      .forEach(files, (file, index) => {
        builder.addFile(`file[${index}]`, file);
      });

    const result = await builder.send<{
      success: boolean;
      location: string;
      reason: string;
      message: string;
    }>(`${this.BASE_URL}/private/api-upload`);

    if (result.body.success === true) {
      return PostResponse.fromWebsite(this)
        .withSourceUrl(`https://furtastic.art${result.responseUrl}`)
        .withAdditionalInfo(result.body);
    }

    return PostResponse.fromWebsite(this)
      .withMessage(result.body.message)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
  }

  onValidateFileSubmission = validatorPassthru;
}
