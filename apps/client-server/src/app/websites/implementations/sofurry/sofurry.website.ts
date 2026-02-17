import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import { SofurryAccountData } from './models/sofurry-account-data';
import { SofurryFileSubmission } from './models/sofurry-file-submission';

interface SofurrySubmissionResponse {
  id: string;
  title: string;
  description: string | null;
  author: string;
  category: number;
  type: number;
  rating: number | null;
  status: number;
  privacy: string | null;
  content: string[];
  allowComments: boolean | null;
  allowDownloads: boolean | null;
  isWorkInProgress: boolean | null;
  isAdvert: boolean | null;
  optimize: boolean | null;
  pixelPerfect: boolean | null;
  onHold: boolean;
  onHoldReason: string | null;
  inReview: boolean | null;
  thumbUrl: string;
  coverUrl: string | null;
  artistTags: string[];
  publishedAt: string | null;
  importedFrom: string | null;
  buyAtVendor: string | null;
  buyAtUrl: string | null;
  customDownloadUrl: string | null;
  folders: string[];
}

interface SoFurryFileUploadResponse {
  contentId: string;
  title: string;
  description: string;
  body: {
    extension: string;
    displayUrl: string;
  };
  position: number;
  type: string;
}

interface SoFurryThumbnailUploadResponse {
  url: string;
}

@WebsiteMetadata({
  name: 'sofurry',
  displayName: 'SoFurry',
})
@UserLoginFlow('https://sofurry.com/login')
@SupportsUsernameShortcut({
  id: 'sofurry',
  url: 'https://sofurry.com/u/$1',
})
@SupportsFiles({
  fileBatchSize: 10, // A guess
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'text/plain',
    'text/html',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'model/gltf-binary',
    'model/gltf+json',
  ],
  acceptedFileSizes: {
    '*': 512000,
  },
})
export default class Sofurry
  extends Website<SofurryAccountData>
  implements FileWebsite<SofurryFileSubmission>
{
  protected BASE_URL = 'https://sofurry.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<SofurryAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(this.BASE_URL, {
        partition: this.accountId,
      });

      // Check for logged in user via window.handle pattern
      const handleMatch = res.body.match(/window\.handle = "(.*)"/);
      if (handleMatch && handleMatch[1] !== 'null' && handleMatch[1]) {
        const username = handleMatch[1];

        // Extract CSRF token from meta tag
        const csrfMatch = res.body.match(
          /<meta name="csrf-token" content="([^"]+)"/,
        );
        const csrfToken = csrfMatch ? csrfMatch[1] : undefined;
        if (csrfToken) {
          // Fetch folders (stub for now)
          await this.getFolders(csrfToken);

          this.setWebsiteData({
            ...this.getWebsiteData(),
            csrfToken,
          });

          return this.loginState.setLogin(true, username);
        }
      }

      return this.loginState.setLogin(false, null);
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.setLogin(false, null);
    }
  }

  /**
   * Fetch a fresh CSRF token from SoFurry.
   */
  private async fetchCsrfToken(): Promise<string | undefined> {
    const res = await Http.get<string>(this.BASE_URL, {
      partition: this.accountId,
    });

    const csrfMatch = res.body.match(
      /<meta name="csrf-token" content="([^"]+)"/,
    );
    return csrfMatch ? csrfMatch[1] : undefined;
  }

  /**
   * Fetch user folders from SoFurry.
   */
  private async getFolders(csrfToken: string): Promise<void> {
    const res = await Http.get<[{ id: string; name: string }]>(
      `${this.BASE_URL}/ui/folders`,
      {
        partition: this.accountId,
        headers: {
          'x-csrf-token': csrfToken,
        },
      },
    );

    const { body } = res;
    const folders: SelectOption[] = [];
    if (Array.isArray(body)) {
      body.forEach((folder) => {
        folders.push({
          label: folder.name,
          value: folder.id,
        });
      });
    }

    this.setWebsiteData({
      folders,
    });
  }

  createFileModel(): SofurryFileSubmission {
    return new SofurryFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  private getRating(rating: SubmissionRating): number {
    switch (rating) {
      case SubmissionRating.EXTREME:
      case SubmissionRating.ADULT:
        return 20; // Adult
      case SubmissionRating.MATURE:
        return 10; // Mature
      case SubmissionRating.GENERAL:
      default:
        return 0; // Clean
    }
  }

  private getDefaultCategoryAndType(fileType: FileType): {
    category: number;
    type: number;
  } {
    switch (fileType) {
      case FileType.AUDIO:
        return { category: 40, type: 41 }; // Music -> Track
      case FileType.TEXT:
        return { category: 20, type: 21 }; // Writing -> Short Story
      case FileType.VIDEO:
        return { category: 50, type: 59 }; // Video -> Other
      case FileType.IMAGE:
      default:
        return { category: 10, type: 11 }; // Artwork -> Drawing
    }
  }

  async onPostFileSubmission(
    postData: PostData<SofurryFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    // Fetch fresh CSRF token before posting
    const csrfToken = await this.fetchCsrfToken();
    if (!csrfToken) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Failed to fetch CSRF token. Please re-login.'),
      );
    }

    // Step 1: Create submission (PUT request - PostBuilder doesn't support PUT)
    cancellationToken.throwIfCancelled();
    const createRes = await Http.put<SofurrySubmissionResponse>(
      `${this.BASE_URL}/ui/submission`,
      {
        partition: this.accountId,
        type: 'json',
        data: {},
        headers: {
          'x-csrf-token': csrfToken,
        },
      },
    );

    if (!createRes.body?.id) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to create submission'))
        .withAdditionalInfo(JSON.stringify(createRes.body));
    }

    const submissionId = createRes.body.id;

    // Step 2: Upload files one at a time to maintain ID order
    const contentIds: string[] = [];
    for (const file of files) {
      cancellationToken.throwIfCancelled();
      const uploadRes = await new PostBuilder(this, cancellationToken)
        .asMultipart()
        .withHeader('X-Csrf-Token', csrfToken)
        .withHeader('origin', this.BASE_URL)
        .withHeader('referer', `${this.BASE_URL}/s/${submissionId}/edit`)
        .setField('name', file.fileName)
        .addFile('file', file)
        .send<SoFurryFileUploadResponse>(
          `${this.BASE_URL}/ui/submission/${submissionId}/content`,
        );

      if (uploadRes.statusCode >= 400 || !uploadRes.body?.contentId) {
        return PostResponse.fromWebsite(this)
          .withException(
            new Error(
              `Failed to upload file "${file.fileName}" (${contentIds.length + 1}/${files.length})`,
            ),
          )
          .withAdditionalInfo(JSON.stringify(uploadRes.body));
      }

      contentIds.push(uploadRes.body.contentId);
    }

    // Step 2b: Upload thumbnail if available
    let thumbUrl: string | null = null;
    const thumbnailFile = files[0].thumbnail ? files[0] : null;
    if (thumbnailFile) {
      cancellationToken.throwIfCancelled();
      const thumbRes = await new PostBuilder(this, cancellationToken)
        .asMultipart()
        .withHeader('X-Csrf-Token', csrfToken)
        .withHeader('origin', this.BASE_URL)
        .withHeader('referer', `${this.BASE_URL}/s/${submissionId}/edit`)
        .setField('name', thumbnailFile.thumbnail.fileName)
        .addThumbnail('file', thumbnailFile)
        .send<SoFurryThumbnailUploadResponse>(
          `${this.BASE_URL}/ui/submission/${submissionId}/thumbnail`,
        );

      if (thumbRes.statusCode < 400 && thumbRes.body?.url) {
        thumbUrl = thumbRes.body.url;
      }
    }

    // Get category and type from options, with fallback to first file's type defaults
    const defaults = this.getDefaultCategoryAndType(files[0].fileType);
    const category = postData.options.category
      ? parseInt(postData.options.category, 10)
      : defaults.category;
    const type = postData.options.type
      ? parseInt(postData.options.type, 10)
      : defaults.type;

    // Step 3: Finalize submission with metadata using PostBuilder
    const finalizeRes = await new PostBuilder(this, cancellationToken)
      .asJson()
      .withHeader('x-csrf-token', csrfToken)
      .setField('title', postData.options.title)
      .setField('category', category)
      .setField('type', type)
      .setField('rating', this.getRating(postData.options.rating))
      .setField('privacy', postData.options.privacy || '3')
      .setField('allowComments', postData.options.allowComments ? 1 : 0)
      .setField('allowDownloads', postData.options.allowDownloads ? 1 : 0)
      .setField('isWip', postData.options.markAsWorkInProgress ? 1 : 0)
      .setField('optimize', 1)
      .setField('pixelPerfect', postData.options.pixelPerfectDisplay ? 1 : 0)
      .setField('isAdvert', postData.options.intendedAsAdvertisement ? 1 : 0)
      .setField('description', postData.options.description)
      .setField('artistTags', postData.options.tags)
      .setField('canPurchase', false)
      .setField('purchaseAtVendor', null)
      .setField('purchaseAtUrl', null)
      .setField('contentOrder', contentIds)
      .setField('thumbUrl', thumbUrl)
      .send<unknown>(`${this.BASE_URL}/ui/submission/${submissionId}`);

    return PostResponse.fromWebsite(this)
      .withSourceUrl(`${this.BASE_URL}/s/${submissionId}`)
      .withMessage('File posted successfully');
  }

  onValidateFileSubmission = validatorPassthru;
}
