import {
    FileType,
    ILoginState,
    ImageResizeProps,
    InstagramAccountData,
    InstagramOAuthRoutes,
    ISubmissionFile,
    OAuthRouteHandlers,
    PostData,
    PostResponse,
    SimpleValidationResult,
} from '@postybirb/types';
import { PostyBirbEnvConfig } from '@postybirb/utils/electron';
import { v4 as uuidv4 } from 'uuid';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { Website } from '../../website';
import {
    getInstagramRedirectUri,
    InstagramApiService,
    retrieveOAuthCode,
} from './instagram-api-service/instagram-api-service';
import { InstagramBlobService } from './instagram-blob-service/instagram-blob-service';
import { InstagramFileSubmission } from './models/instagram-file-submission';

/**
 * Instagram website implementation.
 *
 * Key constraints:
 * - Requires a Business or Creator Instagram account
 * - Each user creates their own Meta Developer App (Development Mode, no App Review needed)
 * - Instagram's API requires publicly accessible image URLs — files are uploaded
 *   to temporary Azure Blob Storage, Instagram cURLs them, then blobs are cleaned up
 * - Images only (v1) — JPEG format required (auto-converted via outputMimeType)
 * - Carousels support up to 10 images
 * - 100 API-published posts per 24-hour period
 * - Long-lived tokens expire after 60 days and must be refreshed
 */
@WebsiteMetadata({
  name: 'instagram',
  displayName: 'Instagram',
})
@CustomLoginFlow()
@SupportsUsernameShortcut({
  id: 'instagram',
  url: 'https://instagram.com/$1',
})
@SupportsFiles({
  fileBatchSize: 10, // Carousel max
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.megabytes(30),
  },
})
@DisableAds()
export default class Instagram
  extends Website<InstagramAccountData>
  implements FileWebsite<InstagramFileSubmission>
{
  protected BASE_URL = 'https://www.instagram.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<InstagramAccountData> =
    {
      appId: true,
      appSecret: true,
      accessToken: false,
      tokenExpiry: true,
      igUserId: false,
      igUsername: true,
    };

  // ========================================================================
  // OAuth Route Handlers
  // ========================================================================

  public onAuthRoute: OAuthRouteHandlers<InstagramOAuthRoutes> = {
    setAppCredentials: async ({ appId, appSecret }) => {
      const current = this.websiteDataStore.getData();
      await this.setWebsiteData({
        ...(current as InstagramAccountData),
        appId,
        appSecret,
      });
      return { success: true };
    },

    getAuthUrl: async () => {
      const { appId } = this.websiteDataStore.getData();
      if (!appId) {
        return {
          success: false,
          message: 'App ID must be set before generating auth URL',
        };
      }

      const state = uuidv4();
      const redirectUri = getInstagramRedirectUri(PostyBirbEnvConfig.port);
      const url = InstagramApiService.getAuthUrl(appId, redirectUri, state);
      return { success: true, url, state };
    },

    retrieveCode: async ({ state }) => {
      if (!state) {
        return { success: false, message: 'State parameter is required' };
      }

      const code = retrieveOAuthCode(state);
      if (code) {
        return { success: true, code };
      }

      return { success: false, message: 'No code available yet' };
    },

    exchangeCode: async ({ code }) => {
      const { appId, appSecret } = this.websiteDataStore.getData();
      if (!appId || !appSecret) {
        return { success: false, message: 'App credentials are not set' };
      }

      try {
        // Step 1: Exchange code for short-lived token
        const redirectUri = getInstagramRedirectUri(PostyBirbEnvConfig.port);
        const tokenResult = await InstagramApiService.exchangeCodeForToken(
          appId,
          appSecret,
          code,
          redirectUri,
        );

        // Step 2: Exchange for long-lived token
        const longLived = await InstagramApiService.getLongLivedToken(
          appSecret,
          tokenResult.accessToken,
        );

        // Step 3: Discover Instagram Business account
        const igAccount = await InstagramApiService.getInstagramBusinessAccount(
          longLived.accessToken,
        );

        // Calculate token expiry
        const tokenExpiry = new Date(
          Date.now() + longLived.expiresIn * 1000,
        ).toISOString();

        // Store everything
        const current = this.websiteDataStore.getData();
        await this.setWebsiteData({
          ...(current as InstagramAccountData),
          accessToken: longLived.accessToken,
          tokenExpiry,
          igUserId: igAccount.igUserId,
          igUsername: igAccount.igUsername,
        });

        await this.onLogin();

        return {
          success: true,
          igUsername: igAccount.igUsername,
          igUserId: igAccount.igUserId,
          tokenExpiry,
        };
      } catch (e) {
        this.logger.error('Instagram OAuth exchange failed', e);
        return {
          success: false,
          message: e instanceof Error ? e.message : 'Failed to complete OAuth',
        };
      }
    },

    refreshToken: async () => {
      const { accessToken } = this.websiteDataStore.getData();
      if (!accessToken) {
        return { success: false, message: 'No access token to refresh' };
      }

      try {
        const result =
          await InstagramApiService.refreshLongLivedToken(accessToken);
        const tokenExpiry = new Date(
          Date.now() + result.expiresIn * 1000,
        ).toISOString();

        const current = this.websiteDataStore.getData();
        await this.setWebsiteData({
          ...(current as InstagramAccountData),
          accessToken: result.accessToken,
          tokenExpiry,
        });

        return { success: true, tokenExpiry };
      } catch (e) {
        this.logger.error('Token refresh failed', e);
        return {
          success: false,
          message: e instanceof Error ? e.message : 'Failed to refresh token',
        };
      }
    },
  };

  // ========================================================================
  // Login
  // ========================================================================

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();

    if (!data?.accessToken || !data?.igUserId || !data?.igUsername) {
      return this.loginState.logout();
    }

    // Check if token is expired
    if (data.tokenExpiry) {
      const expiry = new Date(data.tokenExpiry).getTime();
      const now = Date.now();

      if (now > expiry) {
        this.logger.warn('Instagram token has expired');
        return this.loginState.logout();
      }

      // Auto-refresh if within 7 days of expiry
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (expiry - now < sevenDays) {
        this.logger.info('Instagram token nearing expiry, auto-refreshing');
        try {
          await this.onAuthRoute.refreshToken({} as never);
        } catch (e) {
          this.logger.warn('Auto-refresh failed', e);
        }
      }
    }

    // Verify token is still valid
    const verified = await InstagramApiService.verifyToken(data.accessToken);

    if (verified) {
      return this.loginState.setLogin(true, data.igUsername);
    }

    return this.loginState.logout();
  }

  // ========================================================================
  // File Submission
  // ========================================================================

  createFileModel(): InstagramFileSubmission {
    return new InstagramFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    // Instagram API only accepts JPEG. Convert any input format to JPEG.
    // See: https://developers.facebook.com/docs/instagram-platform/content-publishing#limitations
    const props: ImageResizeProps = {};

    if (file.mimeType !== 'image/jpeg') {
      props.outputMimeType = 'image/jpeg';
    }

    if (file.width > 1080) {
      props.width = 1080;
    }

    if (file.size > FileSize.megabytes(30)) {
      props.maxBytes = FileSize.megabytes(30);
    }

    if (Object.keys(props).length > 0) {
      return props;
    }

    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<InstagramFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const { accessToken, igUserId } = this.websiteDataStore.getData();
    if (!accessToken || !igUserId) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Instagram is not logged in'),
      );
    }

    // Build caption with hashtags
    const caption = this.buildCaption(postData);

    // Upload files to temporary blob storage so Instagram can cURL them
    const uploadedBlobs: Array<{ url: string; blobName: string }> = [];
    try {
      for (const file of files) {
        cancellationToken.throwIfCancelled();
        const ext = file.mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const blob = await InstagramBlobService.upload(
          file.buffer,
          file.mimeType,
          ext,
        );
        uploadedBlobs.push(blob);
      }

      const filesToPost = uploadedBlobs.slice(0, 10);
      let publishResult: { id: string };

      if (filesToPost.length === 1) {
        // Single image post
        const altText = files[0]?.metadata?.altText || '';
        const container = await InstagramApiService.createImageContainer(
          accessToken,
          igUserId,
          filesToPost[0].url,
          caption,
          altText,
        );

        await InstagramApiService.pollUntilReady(accessToken, container.id);
        cancellationToken.throwIfCancelled();

        publishResult = await InstagramApiService.publishMedia(
          accessToken,
          igUserId,
          container.id,
        );
      } else {
        // Carousel post (2-10 images)
        const childIds: string[] = [];

        for (let i = 0; i < filesToPost.length; i++) {
          cancellationToken.throwIfCancelled();
          const altText = files[i]?.metadata?.altText || '';
          const child = await InstagramApiService.createImageContainer(
            accessToken,
            igUserId,
            filesToPost[i].url,
            undefined, // No caption on carousel items
            altText,
            true, // is_carousel_item
          );
          childIds.push(child.id);
        }

        // Create carousel container
        const carousel = await InstagramApiService.createCarouselContainer(
          accessToken,
          igUserId,
          childIds,
          caption,
        );

        // Poll until ready
        await InstagramApiService.pollUntilReady(accessToken, carousel.id);
        cancellationToken.throwIfCancelled();

        // Publish
        publishResult = await InstagramApiService.publishMedia(
          accessToken,
          igUserId,
          carousel.id,
        );
      }

      // Get the permalink for the published post
      const permalink = await InstagramApiService.getMediaPermalink(
        accessToken,
        publishResult.id,
      );

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(publishResult)
        .withSourceUrl(permalink || `${this.BASE_URL}/p/${publishResult.id}/`);
    } catch (e) {
      this.logger.error('Instagram post failed', e);
      return PostResponse.fromWebsite(this)
        .withException(
          e instanceof Error ? e : new Error('Failed to post to Instagram'),
        )
        .withAdditionalInfo(e);
    } finally {
      // Always cleanup blobs, whether post succeeded or failed
      await InstagramBlobService.deleteAll(
        uploadedBlobs.map((b) => b.blobName),
      );
    }
  }

  async onValidateFileSubmission(
    postData: PostData<InstagramFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<InstagramFileSubmission>();

    // Validate caption length (including hashtags)
    const caption = this.buildCaption(postData);
    if (caption.length > 2200) {
      validator.warning(
        'validation.description.max-length',
        {
          currentLength: caption.length,
          maxLength: 2200,
        },
        'description',
      );
    }

    // Validate hashtag count
    const tags = postData.options.tags || [];
    if (tags.length > 30) {
      validator.warning(
        'validation.tags.max-tags',
        {
          currentLength: tags.length,
          maxLength: 30,
        },
        'tags',
      );
    }

    // Validate image aspect ratios
    // Instagram supports: 4:5 portrait (0.8) to 1.91:1 landscape (1.91)
    const files = postData.submission?.files ?? [];
    for (const file of files) {
      if (file.width && file.height) {
        const ratio = file.width / file.height;
        if (ratio < 4 / 5 || ratio > 1.91) {
          validator.error(
            'validation.file.instagram.invalid-aspect-ratio',
            {
              fileName: file.fileName,
              currentRatio: ratio.toFixed(2),
              minRatio: '4:5 (0.80)',
              maxRatio: '1.91:1',
            },
          );
        }
      }
    }

    return validator.result;
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  /**
   * Build the Instagram caption from description + hashtags.
   * Instagram tags are appended as #hashtags at the end of the caption.
   */
  private buildCaption(postData: PostData<InstagramFileSubmission>): string {
    let caption = postData.options.description || '';

    const tags = postData.options.tags || [];
    if (tags.length > 0) {
      const hashtagModel = this.createFileModel();
      const hashtags = tags
        .map((tag) => hashtagModel.processTag(tag))
        .filter((tag) => !!tag)
        .join(' ');
      if (hashtags) {
        caption = caption ? `${caption}\n\n${hashtags}` : hashtags;
      }
    }

    return caption;
  }
}
