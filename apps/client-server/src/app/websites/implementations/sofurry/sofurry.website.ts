import {
  FileType,
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  OAuthRouteHandlers,
  PostData,
  PostResponse,
  SofurryAccountData,
  SofurryOAuthRoutes,
  SubmissionRating,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import {
  getCategorySlug,
  getPrivacySlug,
  getTypeSlug,
} from './models/sofurry-categories';
import { SofurryFileSubmission } from './models/sofurry-file-submission';

interface SofurrySubmissionResponse {
  id: string;
  title: string;
  description: string | null;
  author: string;
  category: string | null;
  type: string | null;
  rating: string | null;
  status: string;
  privacy: string;
  content: unknown[];
  thumbUrl: string | null;
  coverUrl: string | null;
  artistTags: string[];
  publishedAt: string | null;
}

interface SofurryUserResponse {
  handle: string;
  username: string;
}

interface SofurryFileContentResponse {
  contentId: string;
  title: string | null;
  description: string | null;
  body: { url?: string };
  position: number;
  type: string;
}

interface SofurryErrorResponse {
  statusCode?: number;
  message?: string;
  description?: string;
  errorCode?: number;
}

@WebsiteMetadata({
  name: 'sofurry',
  displayName: 'SoFurry',
})
@CustomLoginFlow()
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
    'image/webp',
    'text/plain',
    'application/pdf',
    'audio/mp3',
    'audio/mpeg',
    'video/mp4',
  ],
  acceptedFileSizes: {
    '*': 104857600, // 100 MB (public API maxFileSize)
  },
})
export default class Sofurry
  extends Website<SofurryAccountData>
  implements
    FileWebsite<SofurryFileSubmission>,
    OAuthWebsite<SofurryOAuthRoutes>
{
  protected BASE_URL = 'https://api.sofurry.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<SofurryAccountData> =
    {
      token: false,
    };

  public async onLogin(): Promise<ILoginState> {
    const { token } = this.websiteDataStore.getData();
    if (!token) {
      return this.loginState.logout();
    }

    try {
      const res = await this.platform.http.get<SofurryUserResponse>(
        `${this.BASE_URL}/v1/user/me`,
        {
          partition: this.accountId,
          headers: this.getAuthHeaders(token),
        },
      );

      if (res.statusCode === 200 && res.body?.username) {
        return this.loginState.setLogin(true, res.body.username);
      }

      return this.loginState.logout();
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.logout();
    }
  }

  onAuthRoute: OAuthRouteHandlers<SofurryOAuthRoutes> = {
    login: async (data) => {
      const token = data.token?.trim();
      if (!token) {
        return { result: false };
      }

      try {
        const res = await this.platform.http.get<SofurryUserResponse>(
          `${this.BASE_URL}/v1/user/me`,
          {
            partition: this.accountId,
            headers: this.getAuthHeaders(token),
          },
        );

        if (res.statusCode !== 200 || !res.body?.username) {
          return { result: false };
        }

        await this.setWebsiteData({ token });
        const result = await this.onLogin();
        return { result: result.isLoggedIn };
      } catch (e) {
        this.logger.withError(e).error('onAuthRoute.login failed');
        return { result: false };
      }
    },
  };

  private getAuthHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }

  createFileModel(): SofurryFileSubmission {
    return new SofurryFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  private getRating(rating: SubmissionRating): string {
    switch (rating) {
      case SubmissionRating.EXTREME:
      case SubmissionRating.ADULT:
        return 'adult';
      case SubmissionRating.MATURE:
        return 'mature';
      case SubmissionRating.GENERAL:
      default:
        return 'clean';
    }
  }

  private getDefaultCategorySlug(fileType: FileType): string {
    switch (fileType) {
      case FileType.AUDIO:
        return 'music';
      case FileType.TEXT:
        return 'writing';
      case FileType.VIDEO:
        return 'animation';
      case FileType.IMAGE:
      default:
        return 'artwork';
    }
  }

  private getDefaultTypeSlug(fileType: FileType): string {
    switch (fileType) {
      case FileType.AUDIO:
        return 'music';
      case FileType.TEXT:
        return 'story';
      case FileType.VIDEO:
        return 'animation';
      case FileType.IMAGE:
      default:
        return 'image';
    }
  }

  async onPostFileSubmission(
    postData: PostData<SofurryFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const { token } = this.websiteDataStore.getData();
    if (!token) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Not logged in. Please add your SoFurry access token.'),
      );
    }

    // Step 1: Create an empty draft submission.
    cancellationToken.throwIfCancelled();
    const createRes = await this.platform.http.put<SofurrySubmissionResponse>(
      `${this.BASE_URL}/v1/submission`,
      {
        partition: this.accountId,
        type: 'json',
        data: {},
        headers: this.getAuthHeaders(token),
      },
    );

    if (createRes.statusCode >= 400 || !createRes.body?.id) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to create submission'))
        .withAdditionalInfo(JSON.stringify(createRes.body));
    }

    const submissionId = createRes.body.id;

    // Step 2: Upload files one at a time to maintain content order.
    const contentIds: string[] = [];
    for (const file of files) {
      cancellationToken.throwIfCancelled();
      const uploadRes = await new PostBuilder(this, cancellationToken)
        .asMultipart()
        .withHeader('Authorization', `Bearer ${token}`)
        .withHeader('Accept', 'application/json')
        .addFile('file', file)
        .send<SofurryFileContentResponse>(
          `${this.BASE_URL}/v1/submission/${submissionId}/content`,
        );

      if (uploadRes.statusCode >= 400 || !uploadRes.body?.contentId) {
        return PostResponse.fromWebsite(this)
          .withException(
            new Error(
              `Failed to upload file "${file.fileName}" (${
                contentIds.length + 1
              }/${files.length})`,
            ),
          )
          .withAdditionalInfo(JSON.stringify(uploadRes.body));
      }

      contentIds.push(uploadRes.body.contentId);
    }

    // Resolve category/type slugs from the (numeric) form values, falling back
    // to file-type defaults when not provided.
    const category = postData.options.category
      ? getCategorySlug(postData.options.category)
      : this.getDefaultCategorySlug(files[0].fileType);
    const type = postData.options.type
      ? getTypeSlug(postData.options.type)
      : this.getDefaultTypeSlug(files[0].fileType);

    // Step 3: Finalize the submission with metadata.
    cancellationToken.throwIfCancelled();
    const finalizeRes = await new PostBuilder(this, cancellationToken)
      .asJson()
      .withHeader('Authorization', `Bearer ${token}`)
      .withHeader('Accept', 'application/json')
      .setField('title', postData.options.title)
      .setField('category', category)
      .setField('type', type)
      .setField('rating', this.getRating(postData.options.rating))
      .setField('privacy', getPrivacySlug(postData.options.privacy))
      .setField('allowComments', postData.options.allowComments ?? true)
      .setField('allowDownloads', postData.options.allowDownloads ?? true)
      .setField('isWip', postData.options.markAsWorkInProgress ?? false)
      .setField('optimize', true)
      .setField('pixelPerfect', postData.options.pixelPerfectDisplay ?? false)
      .setField('isAdvert', postData.options.intendedAsAdvertisement ?? false)
      .setField('description', postData.options.description)
      .setField('artistTags', postData.options.tags)
      .setField('canPurchase', false)
      .setField('contentOrder', contentIds)
      .send<SofurrySubmissionResponse | SofurryErrorResponse>(
        `${this.BASE_URL}/v1/submission/${submissionId}`,
      );

    if (finalizeRes.statusCode >= 400) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to finalize submission'))
        .withAdditionalInfo(JSON.stringify(finalizeRes.body));
    }

    return PostResponse.fromWebsite(this)
      .withSourceUrl(`https://sofurry.com/view/${submissionId}`)
      .withMessage('File posted successfully');
  }

  onValidateFileSubmission = validatorPassthru;
}
