import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
} from '@postybirb/types';
import { parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { KoFiAccountData } from './models/ko-fi-account-data';
import { KoFiFileSubmission } from './models/ko-fi-file-submission';

@WebsiteMetadata({
  name: 'ko-fi',
  displayName: 'Ko-fi',
})
@UserLoginFlow('https://ko-fi.com/account/login')
@SupportsFiles({
  fileBatchSize: 10,
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
  acceptedFileSizes: {
    '*': FileSize.mbToBytes(10),
  },
})
export default class KoFi
  extends Website<KoFiAccountData>
  implements FileWebsite<KoFiFileSubmission>
{
  protected BASE_URL = 'https://ko-fi.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<KoFiAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    try {
      // Retrieve settings page to check login status
      const res = await Http.get<string>(`${this.BASE_URL}/settings`, {
        partition: this.accountId,
      });

      // Check if logged in by looking for login button
      if (!res.body.includes('btn-login')) {
        const html = parse(res.body);
        const username = html
          .querySelector('input[name="DisplayName"]')
          ?.getAttribute('value');
        // Extract user ID and username
        const kofiAccountId = html
          .querySelector('input[name="handle"]')
          ?.getAttribute('value');
        this.sessionData.kofiAccountId = kofiAccountId;
        const kofiPageId = this.extractId(res.body);
        this.sessionData.pageId = kofiPageId;

        if (kofiAccountId) {
          await this.retrieveAlbums(kofiAccountId);
        } else {
          this.logger.error('Failed to retrieve Ko-fi account Id');
        }

        return this.loginState.setLogin(true, username || 'Unknown');
      }

      return this.loginState.logout();
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.logout();
    }
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  private extractId(html: string): string | null {
    const match = html.match(/pageId:\s*'([^']+)'/);
    return match ? match[1] : null;
  }

  private async retrieveAlbums(id: string): Promise<void> {
    try {
      const { body } = await Http.get<string>(
        `${this.BASE_URL}/${id}/gallery`,
        {
          partition: this.accountId,
        },
      );

      const albums: SelectOption[] = [];

      // Extract albums from gallery page
      const html = parse(body);
      const albumElements = html.querySelectorAll(
        '.hz-album-each a[href^="/album/"]',
      );

      for (const match of albumElements) {
        const label = match.innerText.trim();
        const albumId = match.getAttribute('href')?.replace('/album/', '');
        albums.push({
          label,
          value: albumId,
        });
      }

      await this.websiteDataStore.setData({ folders: albums });
    } catch (error) {
      this.logger.error('Failed to retrieve albums', error);
    }
  }

  createFileModel(): KoFiFileSubmission {
    return new KoFiFileSubmission();
  }

  async onPostFileSubmission(
    postData: PostData<KoFiFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    // Upload each file and collect image upload IDs
    const imageUploadIds = [];

    for (const file of files) {
      cancellationToken.throwIfCancelled();

      // Upload the file
      const upload = await Http.post<{ ExternalId: string }[]>(
        `${this.BASE_URL}/api/media/gallery-item/upload?throwOnError=true`,
        {
          partition: this.accountId,
          type: 'multipart',
          data: {
            filenames: file.fileName,
            'file[0]': file.toPostFormat(),
          },
        },
      );

      if (typeof upload.body !== 'string') {
        imageUploadIds.push(upload.body[0].ExternalId);
      } else {
        return PostResponse.fromWebsite(this)
          .withException(new Error('Failed to parse upload response'))
          .withAdditionalInfo(upload.body);
      }
    }

    cancellationToken.throwIfCancelled();

    // Create the gallery post
    const post = await Http.post<{ success: boolean }>(
      `${this.BASE_URL}/Gallery/AddGalleryItem`,
      {
        partition: this.accountId,
        type: 'json',
        data: {
          Album: postData.options.album || '',
          Audience: postData.options.audience,
          Description: postData.options.description.toString(),
          EnableHiRes: postData.options.hiRes,
          GalleryItemId: '',
          ImageUploadIds: imageUploadIds,
          PostToTwitter: false,
          ScheduleEnabled: false,
          Title: postData.options.title,
          UploadAsIndividualImages: false,
        },
        headers: {
          Accept: 'text/html, */*',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
          Referer: 'https://ko-fi.com/',
          Connection: 'keep-alive',
        },
      },
    );

    // Check for success in response
    const success =
      typeof post.body === 'string'
        ? !(post.body as string).includes(JSON.stringify({ success: true }))
        : post.body.success;

    if (success) {
      return PostResponse.fromWebsite(this).withAdditionalInfo(post.body);
    }

    return PostResponse.fromWebsite(this)
      .withException(new Error('Post failed'))
      .withAdditionalInfo(post.body);
  }

  onValidateFileSubmission = validatorPassthru;
}
