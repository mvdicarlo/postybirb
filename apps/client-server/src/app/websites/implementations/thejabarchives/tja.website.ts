import { SelectOption } from '@postybirb/form-builder';
import {
    ImageResizeProps,
    LoginResult,
    PostData,
    PostResponse,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { TJAAccountData } from './models/tja-account-data';
import { TJAFileSubmission } from './models/tja-file-submission';

@WebsiteMetadata({
  name: 'thejabarchives',
  displayName: 'The Jab Archives',
})
@UserLoginFlow('https://www.jabarchives.com/main/login')
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
  ],
  acceptedFileSizes: {
    'image/jpeg': 50 * 1024 * 1024,
    'image/png': 50 * 1024 * 1024,
    'image/gif': 50 * 1024 * 1024,
    'video/mp4': 200 * 1024 * 1024,
    'video/webm': 200 * 1024 * 1024,
  },
  fileBatchSize: 1,
})
export default class TheJabArchives
  extends Website<TJAAccountData>
  implements FileWebsite<TJAFileSubmission>
{
  protected readonly BASE_URL = 'https://www.jabarchives.com/main';

  public readonly externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TJAAccountData> =
    {
      username: true,
      displayName: true,
      isArtist: true,
      galleries: true,
    };

  public async onLogin(): Promise<LoginResult> {
    try {
      const res = await this.platform.http.get<{
        username: string;
        displayName: string;
        isArtist: boolean;
      }>(`${this.BASE_URL}/api/v1/userinfo.php`, {
        partition: this.accountId,
      });

      if (res.body?.username) {
        const galleries = await this.retrieveGalleries();
        await this.setWebsiteData({
          username: res.body.username,
          displayName: res.body.displayName,
          isArtist: res.body.isArtist,
          galleries,
        });
        return { loggedIn: true, username: res.body.username };
      }
    } catch {
      // fall through to logged-out state
    }
    return { loggedIn: false };
  }

  private async retrieveGalleries(): Promise<SelectOption[]> {
    try {
      const res = await this.platform.http.get<{
        galleries: Array<{ id: number; title: string }>;
      }>(`${this.BASE_URL}/api/v1/galleries.php`, {
        partition: this.accountId,
      });

      return (res.body?.galleries ?? []).map((g) => ({
        value: String(g.id),
        label: g.title,
      }));
    } catch {
      return [];
    }
  }

  createFileModel(): TJAFileSubmission {
    return new TJAFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<TJAFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const { options } = postData;

    const submit = await new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('gallery_id', options.galleryId ?? '')
      .setField('title', options.title)
      .setField('tags', options.tags.join(', '))
      .setField('description', options.description ?? '')
      .addFile('file', files[0])
      .send<{ success: boolean; id: number; url: string }>(
        `${this.BASE_URL}/api/v1/submit.php`,
      );

    if (!submit.body?.success) {
      return PostResponse.fromWebsite(this)
        .withMessage('Submit failed')
        .withAdditionalInfo(submit.body);
    }

    return PostResponse.fromWebsite(this).withSourceUrl(
      `https://www.jabarchives.com${submit.body.url}`,
    );
  }

  onValidateFileSubmission = validatorPassthru;
}
