import { Http } from '@postybirb/http';
import {
  ILoginState,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { BrowserWindowUtils } from '@postybirb/utils/electron';
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
import { KoFiAccountData, KoFiAlbum } from './models/ko-fi-account-data';
import { KoFiFileSubmission } from './models/ko-fi-file-submission';

@WebsiteMetadata({
  name: 'ko-fi',
  displayName: 'Ko-fi',
})
@UserLoginFlow('https://ko-fi.com/account/login')
@SupportsFiles({
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

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<KoFiAccountData> = {
    galleryFolders: true,
  };

  private sessionData: {
    id?: string;
  } = {};

  public async onLogin(): Promise<ILoginState> {
    try {
      // Retrieve settings page to check login status
      const res = await Http.get<string>(`${this.BASE_URL}/settings`, {
        partition: this.accountId,
      });

      await BrowserWindowUtils.getLocalStorage(this.accountId, this.BASE_URL);

      // Check if logged in by looking for login button
      if (!res.body.includes('btn-login')) {
        // Extract user ID and username
        const displayName = this.extractDisplayName(res.body);
        const id = this.extractId(res.body);

        if (id) {
          this.sessionData.id = id;
          this.websiteDataStore.id = id;
          
          // Get albums
          await this.retrieveAlbums(id);
        }

        return this.loginState.setLogin(true, displayName || 'Unknown');
      }

      return this.loginState.logout();
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.logout();
    }
  }

  private extractDisplayName(html: string): string | null {
    const match = html.match(/DisplayName"\s+value="([^"]+)"/);
    return match ? match[1] : null;
  }

  private extractId(html: string): string | null {
    const match = html.match(/pageId:\s*'([^']+)'/);
    return match ? match[1] : null;
  }

  private async retrieveAlbums(id: string): Promise<void> {
    try {
      const { body } = await Http.get<string>(`${this.BASE_URL}/${id}/gallery`, {
        partition: this.accountId,
      });
      
      const albums: KoFiAlbum[] = [];
      
      // Extract albums from gallery page
      const albumMatches = body.matchAll(/<div class="hz-album-each[^>]*>.*?<a href="\/([^\/]+)\/gallery\/([^"]+)".*?>([^<]+)<\/a>/gs);
      
      for (const match of albumMatches) {
        const albumId = match[2];
        const albumName = match[3].trim();
        
        if (albumName !== 'New') {
          albums.push({
            label: albumName,
            value: albumId,
          });
        }
      }
      
      this.websiteDataStore.galleryFolders = albums;
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
    try {
      // Upload each file and collect image upload IDs
      const imageUploadIds = [];
      const filesToPost = files.slice(0, 8); // Ko-fi maximum is 8 files
      
      for (const file of filesToPost) {
        cancellationToken.throwIfCancelled();
        
        // Upload the file
        const upload = await Http.post<string>(
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

        // Parse response and extract ID
        const json = JSON.parse(upload.body);
        if (json && json[0] && json[0].ExternalId) {
          imageUploadIds.push(json[0].ExternalId);
        } else {
          return PostResponse.fromWebsite(this)
            .withMessage('Failed to parse upload response')
            .withAdditionalInfo(upload.body);
        }
      }

      cancellationToken.throwIfCancelled();
      
      // Create the gallery post
      const post = await Http.post<string>(
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
            'Accept-Encoding': 'gzip, deflate, br',
            Accept: 'text/html, */*',
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
            Referer: 'https://ko-fi.com/',
            Connection: 'keep-alive',
          },
        },
      );

      // Check for success in response
      const success = post.body.includes(JSON.stringify({ success: true }));
      
      if (success) {
        return PostResponse.fromWebsite(this)
          .withSourceUrl(`${this.BASE_URL}/${this.sessionData.id}/gallery`);
      }

      return PostResponse.fromWebsite(this)
        .withMessage('Post failed')
        .withAdditionalInfo(post.body);
    } catch (e) {
      this.logger.error('Failed to post submission', e);
      return PostResponse.fromWebsite(this)
        .withMessage(e.message)
        .withException(e);
    }
  }
  
  onValidateFileSubmission = validatorPassthru;
}