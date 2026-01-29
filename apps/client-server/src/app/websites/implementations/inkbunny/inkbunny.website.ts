import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  InkbunnyAccountData,
  IPostResponse,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
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
import {
  FileWebsite,
  PostBatchData,
} from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { InkbunnyFileSubmission } from './models/inkbunny-file-submission';

@WebsiteMetadata({
  name: 'inkbunny',
  displayName: 'Inkbunny',
})
@CustomLoginFlow()
@SupportsUsernameShortcut({
  id: 'inkbunny',
  url: 'https://inkbunny.net/$1',
  convert: (websiteName, shortcut) => {
    if (websiteName === 'inkbunny') {
      switch (shortcut) {
        case 'furaffinity':
          return `[fa]$1[/fa]`;
        case 'sofurry':
          return `[sf]$1[/sf]`;
        case 'deviantart':
          return `[da]$1[/da]`;
        case 'weasyl':
          return `[w]$1[/w]`;
        case 'inkbunny':
          return `[iconname]$1[/iconname]`;
        default:
          return undefined;
      }
    }
    return undefined;
  },
})
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/x-shockwave-flash',
    'video/x-flv',
    'video/mp4',
    'application/msword',
    'application/rtf',
    'text/plain',
    'audio/mpeg',
    'audio/mpeg3',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(200),
  },
  fileBatchSize: 30,
})
export default class Inkbunny
  extends Website<InkbunnyAccountData>
  implements FileWebsite<InkbunnyFileSubmission>
{
  protected BASE_URL = 'https://inkbunny.net';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<InkbunnyAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();

    if (!data.username || !data.sid) {
      return this.loginState.setLogin(false, null);
    }

    try {
      const authCheck = await Http.post<{ error_code?: string }>(
        `${this.BASE_URL}/api_watchlist.php`,
        {
          partition: this.accountId,
          type: 'multipart',
          data: {
            sid: data.sid,
            limit: 5,
          },
        },
      );

      if (authCheck.body && !authCheck.body.error_code) {
        return this.loginState.setLogin(true, data.username);
      }

      return this.loginState.setLogin(false, null);
    } catch (error) {
      this.logger.error('Failed to check Inkbunny login status', error);
      return this.loginState.setLogin(false, null);
    }
  }

  createFileModel(): InkbunnyFileSubmission {
    return new InkbunnyFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<InkbunnyFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
    batch: PostBatchData,
  ): Promise<IPostResponse> {
    try {
      cancellationToken.throwIfCancelled();

      const data = this.websiteDataStore.getData();
      const { options } = postData;

      const builder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('sid', data.sid)
        .forEach(files, (file, index) => {
          builder.addFile(`uploadedfile[${index}]`, file);
        })
        .setConditional(
          'uploadedthumbnail[]',
          !!files[0].thumbnail,
          files[0].thumbnailToPostFormat(),
        );

      const uploadResult = await builder.send<{
        sid?: string;
        submission_id?: string;
        error_code?: string;
      }>(`${this.BASE_URL}/api_upload.php`);

      if (!uploadResult.body?.sid || !uploadResult.body?.submission_id) {
        const errorMessage =
          uploadResult.body?.error_code ||
          'Upload failed without error message';
        this.logger.error('Inkbunny upload failed', errorMessage);
        return PostResponse.fromWebsite(this)
          .withException(new Error(errorMessage))
          .withAdditionalInfo(uploadResult.body);
      }

      // Step 2: Edit submission details
      const ratings = this.getRating(options.rating);
      const editBuilder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('sid', data.sid)
        .setField('submission_id', uploadResult.body.submission_id)
        .setField('title', options.title)
        .setField('desc', options.description.replace(/\[hr\]/g, '-----'))
        .setField('keywords', this.formatTags(options.tags).join(',').trim())
        .setConditional('type', !!options.category, options.category)
        .setConditional('scraps', options.scraps, 'yes')
        .setConditional('visibility', options.notify, 'yes', 'yes_nowatch')
        .setConditional('guest_block', options.blockGuests, 'yes')
        .setConditional('friends_only', options.friendsOnly, 'yes')
        .forEach(ratings.split(','), (rating) => {
          if (rating !== '0') {
            editBuilder.setField(`tag[${rating}]`, 'yes');
          }
        });

      const editResult = await editBuilder.send<{
        error_code?: string;
        submission_id?: string;
      }>(`${this.BASE_URL}/api_editsubmission.php`);

      if (
        !editResult.body.submission_id ||
        editResult.body.error_code !== undefined
      ) {
        const errorMessage =
          editResult.body.error_code ||
          'Submission edit failed without error message';
        this.logger.error('Inkbunny submission edit failed', errorMessage);
        return PostResponse.fromWebsite(this)
          .withException(new Error(errorMessage))
          .withAdditionalInfo(editResult.body);
      }

      const sourceUrl = `${this.BASE_URL}/s/${editResult.body.submission_id}`;
      return PostResponse.fromWebsite(this)
        .withSourceUrl(sourceUrl)
        .withAdditionalInfo(editResult.body);
    } catch (error) {
      this.logger.error('Unexpected error during Inkbunny submission', error);
      return PostResponse.fromWebsite(this)
        .withException(
          error instanceof Error ? error : new Error(String(error)),
        )
        .withAdditionalInfo({ postData, files, batch });
    }
  }

  onValidateFileSubmission = validatorPassthru;

  private formatTags(tags: string[]): string[] {
    return tags.map((tag) =>
      tag.trim().replace(/\s/g, '_').replace(/\\/g, '/'),
    );
  }

  private getRating(rating: SubmissionRating): string {
    switch (rating) {
      case SubmissionRating.GENERAL:
        return '0';
      case SubmissionRating.MATURE:
        return '2';
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return '4';
      default:
        return rating; // potential custom value
    }
  }
}
