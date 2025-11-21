import {
    FileType,
    ILoginState,
    ImageResizeProps,
    ISubmissionFile,
    MegalodonAccountData,
    MegalodonOAuthRoutes,
    OAuthRouteHandlers,
    PostData,
    PostResponse,
    SimpleValidationResult,
    SubmissionRating,
} from '@postybirb/types';
import { detector, Entity } from 'megalodon';
import { Readable } from 'stream';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import {
    FediverseInstanceTypes,
    MegalodonApiService,
} from './megalodon-api-service';
import { MegalodonFileSubmission } from './models/megalodon-file-submission';
import { MegalodonMessageSubmission } from './models/megalodon-message-submission';

/**
 * Instance configuration limits fetched from the Fediverse instance.
 * These are cached after login to avoid repeated API calls.
 */
interface InstanceLimits {
  maxCharacters: number;
  maxMediaAttachments: number;
  imageSizeLimit?: number;
  videoSizeLimit?: number;
  imageMatrixLimit?: number;
  videoMatrixLimit?: number;
  supportedMimeTypes?: string[];
}

/**
 * Base class for all Fediverse websites using the Megalodon library.
 * Provides common OAuth flow and posting logic.
 *
 * Subclasses (Mastodon, Pleroma, etc.) can override specific behaviors.
 */
export abstract class MegalodonWebsite
  extends Website<MegalodonAccountData>
  implements
    FileWebsite<MegalodonFileSubmission>,
    MessageWebsite<MegalodonMessageSubmission>,
    OAuthWebsite<MegalodonOAuthRoutes>
{
  protected BASE_URL = ''; // Set by instance URL

  /**
   * Cached instance configuration limits.
   * Fetched on login and used for validation.
   */
  private instanceLimits: InstanceLimits | null = null;

  // Subclasses can override to provide specific accessibility
  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<MegalodonAccountData> =
    {
      instanceUrl: true,
      clientId: true,
      clientSecret: true,
      username: true,
      displayName: true,
      instanceType: true,
      accessToken: false, // Never expose token
      authCode: false, // Temporary, don't expose
    };

  /**
   * OAuth app name to register with instances.
   * Subclasses can override for branding.
   */
  protected getAppName(): string {
    return 'PostyBirb';
  }

  /**
   * OAuth app website URL.
   * Subclasses can override for branding.
   */
  protected getAppWebsite(): string {
    return 'https://postybirb.com';
  }

  /**
   * OAuth redirect URI.
   * Since we're doing in-app OAuth, we use urn:ietf:wg:oauth:2.0:oob
   */
  protected getRedirectUri(): string {
    return 'urn:ietf:wg:oauth:2.0:oob';
  }

  /**
   * OAuth scopes to request.
   * Subclasses can override for specific needs.
   */
  protected getScopes(): string {
    return 'read write';
  }

  /**
   * Get the Megalodon API instance type.
   * Subclasses must override to specify their type.
   */
  protected abstract getMegalodonInstanceType(): FediverseInstanceTypes;

  private async detectMegalodonInstanceType(
    instanceUrl: string,
  ): Promise<FediverseInstanceTypes | undefined> {
    const instanceType = await detector(instanceUrl);
    return instanceType;
  }

  private async getInstanceType(
    instanceUrl: string,
  ): Promise<FediverseInstanceTypes> {
    const detectedType = await this.detectMegalodonInstanceType(instanceUrl);
    return detectedType || this.getMegalodonInstanceType();
  }

  // OAuth step handlers
  public onAuthRoute: OAuthRouteHandlers<MegalodonOAuthRoutes> = {
    registerApp: async ({ instanceUrl }) => {
      try {
        const normalizedUrl = this.normalizeInstanceUrl(instanceUrl);

        // Register app with the instance
        const instanceType = await this.getInstanceType(instanceUrl);
        const appData = await MegalodonApiService.registerApp(
          normalizedUrl,
          instanceType,
          {
            client_name: this.getAppName(),
            redirect_uris: this.getRedirectUri(),
            scopes: this.getScopes(),
            website: this.getAppWebsite(),
          },
        );

        // Generate authorization URL
        const authUrl = MegalodonApiService.generateAuthUrl(
          normalizedUrl,
          appData.clientId,
          this.getRedirectUri(),
          this.getScopes(),
        );

        // Store client credentials
        const current = this.websiteDataStore.getData();
        await this.setWebsiteData({
          ...(current as MegalodonAccountData),
          instanceUrl: normalizedUrl,
          clientId: appData.clientId,
          clientSecret: appData.clientSecret,
          instanceType,
        });

        return {
          success: true,
          authorizationUrl: authUrl,
          clientId: appData.clientId,
          clientSecret: appData.clientSecret,
        };
      } catch (error) {
        this.logger.error('Failed to register app', error);
        return {
          success: false,
          message: `Failed to register with instance: ${error.message}`,
        };
      }
    },

    completeOAuth: async ({ authCode }) => {
      const data = this.websiteDataStore.getData();

      if (!data.clientId || !data.clientSecret || !data.instanceUrl) {
        return {
          success: false,
          message:
            'Missing client credentials. Please restart the login process.',
        };
      }

      try {
        // Exchange code for access token
        const tokenData = await MegalodonApiService.fetchAccessToken(
          data.instanceUrl,
          data.clientId,
          data.clientSecret,
          authCode,
          this.getRedirectUri(),
          this.getMegalodonInstanceType(),
        );

        // Verify credentials and get user info
        const client = MegalodonApiService.createClient(
          data.instanceUrl,
          tokenData.access_token,
          this.getMegalodonInstanceType(),
        );

        const account = await client.verifyAccountCredentials();

        // Store final credentials
        await this.setWebsiteData({
          ...(data as MegalodonAccountData),
          accessToken: tokenData.access_token,
          username: account.data.username || account.data.acct,
          displayName: account.data.display_name,
          authCode: undefined, // Clear temporary code
        });

        await this.onLogin();

        return {
          success: true,
          username: account.data.username || account.data.acct,
          displayName: account.data.display_name,
        };
      } catch (error) {
        this.logger.error('Failed to complete OAuth', error);
        return {
          success: false,
          message: `Failed to authenticate: ${error.message}`,
        };
      }
    },
  };

  /**
   * Normalize instance URL to consistent format.
   */
  private normalizeInstanceUrl(url: string): string {
    let normalized = url.trim().toLowerCase();
    normalized = normalized.replace(/^(https?:\/\/)/, '');
    normalized = normalized.replace(/\/$/, '');
    return normalized;
  }

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();

    if (data?.accessToken && data?.username && data?.instanceUrl) {
      try {
        // Verify the token is still valid
        const client = MegalodonApiService.createClient(
          data.instanceUrl,
          data.accessToken,
          this.getMegalodonInstanceType(),
        );

        const account = await client.verifyAccountCredentials();

        // Fetch instance configuration for limits
        await this.fetchInstanceLimits(client);

        // Need to manually override decorated prop
        if (this.decoratedProps.fileOptions) {
          this.decoratedProps.fileOptions.fileBatchSize =
            this.instanceLimits.maxMediaAttachments || 4;

          if (this.instanceLimits.supportedMimeTypes?.length) {
            this.decoratedProps.fileOptions.acceptedMimeTypes =
              this.instanceLimits.supportedMimeTypes;
          }

          if (this.instanceLimits.imageSizeLimit) {
            this.decoratedProps.fileOptions.acceptedFileSizes = {
              [FileType.IMAGE]: this.instanceLimits.imageSizeLimit,
            };
          }

          if (this.instanceLimits.videoSizeLimit) {
            this.decoratedProps.fileOptions.acceptedFileSizes = {
              [FileType.VIDEO]: this.instanceLimits.videoSizeLimit,
            };
            this.decoratedProps.fileOptions.acceptedFileSizes = {
              [FileType.AUDIO]: this.instanceLimits.videoSizeLimit,
            };
          }
        }

        return this.loginState.setLogin(
          true,
          `${account.data.username}@${data.instanceUrl}`,
        );
      } catch (error) {
        this.logger.error('Token verification failed', error);
        return this.loginState.logout();
      }
    }

    return this.loginState.logout();
  }

  /**
   * Fetch instance configuration to get dynamic limits.
   * This is called after successful login.
   */
  private async fetchInstanceLimits(
    client: ReturnType<typeof MegalodonApiService.createClient>,
  ): Promise<void> {
    try {
      const instanceResponse = await client.getInstance();
      const instance = instanceResponse.data as Entity.Instance;

      // Extract limits from instance configuration
      this.instanceLimits = {
        maxCharacters:
          instance.configuration?.statuses?.max_characters ||
          this.getDefaultMaxDescriptionLength(),
        maxMediaAttachments:
          instance.configuration?.statuses?.max_media_attachments || 4,
      };

      // Mastodon-specific media attachment limits (if available)
      // Type assertion needed as not all platforms include media_attachments
      const config = instance.configuration as {
        statuses?: {
          max_characters?: number;
          max_media_attachments?: number;
        };
        media_attachments?: {
          image_size_limit?: number;
          video_size_limit?: number;
          image_matrix_limit?: number;
          video_matrix_limit?: number;
          supported_mime_types?: string[];
        };
      };

      if (config?.media_attachments) {
        this.instanceLimits.imageSizeLimit =
          config.media_attachments.image_size_limit;
        this.instanceLimits.videoSizeLimit =
          config.media_attachments.video_size_limit;
        this.instanceLimits.imageMatrixLimit =
          config.media_attachments.image_matrix_limit;
        this.instanceLimits.videoMatrixLimit =
          config.media_attachments.video_matrix_limit;
        this.instanceLimits.supportedMimeTypes =
          config.media_attachments.supported_mime_types;
      }

      this.logger
        .withMetadata({ ...this.instanceLimits })
        .info(
          `Fetched instance limits for ${this.websiteDataStore.getData().instanceUrl}`,
        );
    } catch (error) {
      this.logger.error('Failed to fetch instance limits', error);
      // Use defaults if fetching fails
      this.instanceLimits = {
        maxCharacters: this.getDefaultMaxDescriptionLength(),
        maxMediaAttachments: 4,
      };
    }
  }

  /**
   * Get the cached max characters limit from the instance.
   * Falls back to default if not yet fetched.
   */
  protected getMaxDescriptionLength(): number {
    return (
      this.instanceLimits?.maxCharacters ||
      this.getDefaultMaxDescriptionLength()
    );
  }

  /**
   * Get the default max description length for this platform.
   * Subclasses should override this.
   */
  protected abstract getDefaultMaxDescriptionLength(): number;

  /**
   * Get the cached max media attachments limit from the instance.
   */
  protected getMaxMediaAttachments(): number {
    return this.instanceLimits?.maxMediaAttachments || 4;
  }

  /**
   * Get the image size limit in bytes from the instance.
   */
  protected getImageSizeLimit(): number | undefined {
    return this.instanceLimits?.imageSizeLimit;
  }

  /**
   * Get the video size limit in bytes from the instance.
   */
  protected getVideoSizeLimit(): number | undefined {
    return this.instanceLimits?.videoSizeLimit;
  }

  /**
   * Get the image matrix limit (width * height) from the instance.
   */
  protected getImageMatrixLimit(): number | undefined {
    return this.instanceLimits?.imageMatrixLimit;
  }

  /**
   * Get the video matrix limit (width * height) from the instance.
   */
  protected getVideoMatrixLimit(): number | undefined {
    return this.instanceLimits?.videoMatrixLimit;
  }

  /**
   * Get supported MIME types from the instance.
   */
  protected getSupportedMimeTypes(): string[] | undefined {
    return this.instanceLimits?.supportedMimeTypes;
  }

  createFileModel(): MegalodonFileSubmission {
    return new MegalodonFileSubmission();
  }

  createMessageModel(): MegalodonMessageSubmission {
    return new MegalodonMessageSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    const imageSizeLimit = this.getImageSizeLimit();
    const imageMatrixLimit = this.getImageMatrixLimit();

    // Check if file exceeds any limits
    const exceedsSize = imageSizeLimit && file.size > imageSizeLimit;
    const exceedsMatrix =
      imageMatrixLimit &&
      file.width &&
      file.height &&
      file.width * file.height > imageMatrixLimit;

    this.logger
      .withMetadata({
        fileName: file.fileName,
        fileSize: file.size,
        fileWidth: file.width,
        fileHeight: file.height,
        filePixels: file.width && file.height ? file.width * file.height : 0,
        imageSizeLimit,
        imageMatrixLimit,
        exceedsSize,
        exceedsMatrix,
      })
      .debug('Checking image resize requirements');

    // Only return resize props if the file exceeds limits
    if (!exceedsSize && !exceedsMatrix) {
      return undefined;
    }

    const props: ImageResizeProps = {};

    // Set size limit if exceeded
    if (exceedsSize) {
      props.maxBytes = imageSizeLimit;
    }

    // Calculate dimension constraints if matrix limit exceeded
    if (exceedsMatrix && file.width && file.height) {
      // Calculate scale factor to fit within matrix limit
      const currentPixels = file.width * file.height;
      const scaleFactor = Math.sqrt(imageMatrixLimit / currentPixels);

      // Set max dimensions while preserving aspect ratio
      props.width = Math.floor(file.width * scaleFactor);
      props.height = Math.floor(file.height * scaleFactor);
    }

    this.logger
      .withMetadata({ resizeProps: props })
      .info('Image resize required');

    return props;
  }

  async onPostFileSubmission(
    postData: PostData<MegalodonFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const data = this.websiteDataStore.getData();
    const client = MegalodonApiService.createClient(
      data.instanceUrl,
      data.accessToken,
      this.getMegalodonInstanceType(),
    );

    try {
      // Upload media files
      const mediaIds: string[] = [];
      for (const file of files) {
        cancellationToken.throwIfCancelled();

        this.logger
          .withMetadata({
            fileName: file.fileName,
            fileSize: file.buffer.length,
            mimeType: file.mimeType,
            hasAltText: !!file.metadata.altText,
          })
          .info('Uploading media file to Fediverse instance');

        // Megalodon's uploadMedia uses form-data which expects a stream
        // combined-stream checks for stream-like objects using isStreamLike
        // Create a Readable stream from the buffer
        const stream = Readable.from(file.buffer);
        
        // Add metadata properties that form-data looks for when creating the Content-Disposition header
        // These properties are checked by form-data to set filename and content-type
        Object.assign(stream, {
          path: file.fileName,
          name: file.fileName,
          type: file.mimeType,
        });

        const uploadResult = await client.uploadMedia(stream, {
          description: file.metadata.altText || undefined,
        });

        this.logger
          .withMetadata({
            mediaId: uploadResult.data.id,
            mediaType: uploadResult.data.type,
          })
          .info('Media file uploaded successfully');

        mediaIds.push(uploadResult.data.id);
      }

      // Build description with tags
      const description = postData.options.description || '';

      const isSensitiveRating =
        postData.options.rating === SubmissionRating.ADULT ||
        postData.options.rating === SubmissionRating.EXTREME;

      // Create status with media
      const statusResult = await client.postStatus(description, {
        media_ids: mediaIds,
        sensitive: postData.options.sensitive || isSensitiveRating || false,
        visibility: postData.options.visibility || 'public',
        spoiler_text: postData.options.spoilerText || undefined,
        language: postData.options.language || undefined,
      });

      const status = statusResult.data;
      // Check if it's a Status (not ScheduledStatus)
      if ('uri' in status) {
        const sourceUrl = status.url || status.uri;
        return PostResponse.fromWebsite(this)
          .withAdditionalInfo(statusResult.data)
          .withSourceUrl(sourceUrl);
      }

      // ScheduledStatus - post was scheduled for later
      return PostResponse.fromWebsite(this).withAdditionalInfo({
        message: 'Post scheduled successfully',
        scheduled_at: status.scheduled_at,
      });
    } catch (error) {
      this.logger.error('Failed to post file submission', error);
      return PostResponse.fromWebsite(this).withException(
        new Error(`Failed to post: ${error.message}`),
      );
    }
  }

  async onPostMessageSubmission(
    postData: PostData<MegalodonMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const data = this.websiteDataStore.getData();
    const client = MegalodonApiService.createClient(
      data.instanceUrl,
      data.accessToken,
      this.getMegalodonInstanceType(),
    );

    try {
      // Build description with tags
      let description = postData.options.description || '';
      const tags = postData.options.tags || [];
      if (tags.length > 0) {
        const processedTags = tags
          .map((tag) => this.createMessageModel().processTag(tag))
          .join(' ');
        description = `${description}\n\n${processedTags}`.trim();
      }

      const isSensitiveRating =
        postData.options.rating === SubmissionRating.ADULT ||
        postData.options.rating === SubmissionRating.EXTREME;

      const statusResult = await client.postStatus(description, {
        sensitive: postData.options.sensitive || isSensitiveRating || false,
        visibility: postData.options.visibility || 'public',
        spoiler_text: postData.options.spoilerText || undefined,
        language: postData.options.language || undefined,
      });

      const status = statusResult.data;
      // Check if it's a Status (not ScheduledStatus)
      if ('uri' in status) {
        const sourceUrl = status.url || status.uri;
        return PostResponse.fromWebsite(this).withSourceUrl(sourceUrl);
      }

      // ScheduledStatus - post was scheduled for later
      return PostResponse.fromWebsite(this).withAdditionalInfo({
        message: 'Post scheduled successfully',
        scheduled_at: status.scheduled_at,
      });
    } catch (error) {
      this.logger.error('Failed to post message submission', error);
      return PostResponse.fromWebsite(this).withException(
        new Error(`Failed to post: ${error.message}`),
      );
    }
  }

  async onValidateFileSubmission(
    postData: PostData<MegalodonFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<MegalodonFileSubmission>();

    // Basic validations - subclasses can add more
    const descLength = postData.options.description?.length || 0;
    const maxLength = this.getMaxDescriptionLength();

    if (descLength > maxLength) {
      validator.error(
        'validation.description.max-length',
        {
          currentLength: descLength,
          maxLength,
        },
        'description',
      );
    }

    return validator.result;
  }

  async onValidateMessageSubmission(
    postData: PostData<MegalodonMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<MegalodonMessageSubmission>();

    const descLength = postData.options.description?.length || 0;
    const maxLength = this.getMaxDescriptionLength();

    if (descLength > maxLength) {
      validator.error(
        'validation.description.max-length',
        {
          currentLength: descLength,
          maxLength,
        },
        'description',
      );
    }

    return validator.result;
  }
}
