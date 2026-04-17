import { Logger } from '@postybirb/logger';
import {
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  MisskeyAccountData,
  MisskeyOAuthRoutes,
  OAuthRouteHandlers,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { calculateImageResize } from '@postybirb/utils/file-type';
import { v4 as uuidv4 } from 'uuid';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import { MisskeyApiService } from './misskey-api-service';
import { MisskeyFileSubmission } from './models/misskey-file-submission';
import { MisskeyMessageSubmission } from './models/misskey-message-submission';

const MIAUTH_PERMISSIONS = [
  'read:account',
  'write:notes',
  'read:drive',
  'write:drive',
];

@WebsiteMetadata({
  name: 'misskey',
  displayName: 'Misskey',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/apng',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(30),
  },
  fileBatchSize: 16,
})
@DisableAds()
export default class Misskey
  extends Website<MisskeyAccountData>
  implements
    FileWebsite<MisskeyFileSubmission>,
    MessageWebsite<MisskeyMessageSubmission>,
    OAuthWebsite<MisskeyOAuthRoutes>
{
  protected readonly logger = Logger('Misskey');

  protected BASE_URL = '';

  private maxNoteTextLength = 3000;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<MisskeyAccountData> =
    {
      instanceUrl: true,
      username: true,
      accessToken: false,
      miAuthSessionId: false,
    };

  // ========================================================================
  // OAuth / MiAuth
  // ========================================================================

  public onAuthRoute: OAuthRouteHandlers<MisskeyOAuthRoutes> = {
    generateAuthUrl: async ({ instanceUrl }) => {
      try {
        const normalizedUrl = instanceUrl
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '');

        const sessionId = uuidv4();
        const authUrl = MisskeyApiService.buildMiAuthUrl(
          normalizedUrl,
          sessionId,
          'PostyBirb',
          MIAUTH_PERMISSIONS,
        );

        await this.setWebsiteData({
          ...this.websiteDataStore.getData(),
          instanceUrl: normalizedUrl,
          miAuthSessionId: sessionId,
        });

        return { success: true, authUrl, sessionId };
      } catch (error) {
        this.logger.error('Failed to generate MiAuth URL', error);
        return {
          success: false,
          message: `Failed to generate auth URL: ${error.message}`,
        };
      }
    },

    completeAuth: async () => {
      const data = this.websiteDataStore.getData();
      if (!data.instanceUrl || !data.miAuthSessionId) {
        return {
          success: false,
          message: 'Missing instance URL or session. Please start over.',
        };
      }

      try {
        const result = await MisskeyApiService.checkMiAuth(
          data.instanceUrl,
          data.miAuthSessionId,
        );

        await this.setWebsiteData({
          ...data,
          accessToken: result.token,
          username: result.user.username,
          miAuthSessionId: undefined, // Clear temporary session
        });

        await this.onLogin();

        return { success: true, username: result.user.username };
      } catch (error) {
        this.logger.error('MiAuth completion failed', error);
        return {
          success: false,
          message: `Authentication failed: ${error.message}`,
        };
      }
    },
  };

  // ========================================================================
  // Login
  // ========================================================================

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();

    if (!data?.accessToken || !data?.instanceUrl) {
      return this.loginState.logout();
    }

    try {
      const user = await MisskeyApiService.verifyCredentials(
        data.instanceUrl,
        data.accessToken,
      );

      // Apply per-user policies (file size only — MIME type overrides are skipped because
      // Misskey returns glob-style patterns like 'image/' and 'audio/*' that are incompatible
      // with the app's exact-match MIME type handling. The static @SupportsFiles list is used.)
      if (user.policies && this.decoratedProps.fileOptions) {
        if (user.policies.maxFileSizeMb) {
          this.decoratedProps.fileOptions.acceptedFileSizes = {
            '*': FileSize.megabytes(user.policies.maxFileSizeMb),
          };
        }
      }

      // Fetch instance limits
      try {
        const meta = await MisskeyApiService.getInstanceMeta(data.instanceUrl);
        this.logger
          .withMetadata(meta)
          .info(`Fetched instance metadata for ${data.instanceUrl}`);
        if (meta.maxNoteTextLength) {
          this.maxNoteTextLength = meta.maxNoteTextLength;
        }
      } catch (e) {
        this.logger.warn('Failed to fetch instance metadata', e);
      }

      return this.loginState.setLogin(
        true,
        `${user.username}@${data.instanceUrl}`,
      );
    } catch (error) {
      this.logger.error('Misskey login verification failed', error);
      return this.loginState.logout();
    }
  }

  // ========================================================================
  // File Submission
  // ========================================================================

  createFileModel(): MisskeyFileSubmission {
    return new MisskeyFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return calculateImageResize(file, {
      maxBytes:
        this.decoratedProps.fileOptions?.acceptedFileSizes?.['*'] ||
        FileSize.megabytes(30),
    });
  }

  async onPostFileSubmission(
    postData: PostData<MisskeyFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const { accessToken, instanceUrl } = this.websiteDataStore.getData();
    if (!accessToken || !instanceUrl) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Misskey is not logged in'),
      );
    }

    try {
      // Upload files to Misskey Drive
      const fileIds: string[] = [];
      for (const file of files) {
        cancellationToken.throwIfCancelled();

        this.logger
          .withMetadata({
            fileName: file.fileName,
            fileSize: file.buffer.length,
            mimeType: file.mimeType,
          })
          .info('Uploading file to Misskey Drive');

        const driveFile = await MisskeyApiService.uploadFile(
          instanceUrl,
          accessToken,
          file.buffer,
          file.fileName,
          file.mimeType,
          {
            comment: file.metadata?.altText || undefined,
            isSensitive: postData.options.sensitive || undefined,
          },
        );

        fileIds.push(driveFile.id);
      }

      // Build description with tags
      let description = postData.options.description || '';
      const tags = postData.options.tags || [];
      if (tags.length > 0) {
        const processedTags = tags
          .map((tag) => this.createFileModel().processTag(tag))
          .filter((tag) => !!tag)
          .join(' ');
        if (processedTags) {
          description = description
            ? `${description}\n\n${processedTags}`
            : processedTags;
        }
      }

      cancellationToken.throwIfCancelled();

      // Create the note
      const note = await MisskeyApiService.createNote(
        instanceUrl,
        accessToken,
        {
          text: description || undefined,
          fileIds,
          visibility: postData.options.visibility || 'public',
          cw: postData.options.cw || undefined,
          localOnly: postData.options.localOnly || false,
        },
      );

      const sourceUrl =
        note.url || note.uri || `https://${instanceUrl}/notes/${note.id}`;

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(note)
        .withSourceUrl(sourceUrl);
    } catch (error) {
      this.logger.error('Failed to post file submission to Misskey', error);
      return PostResponse.fromWebsite(this).withException(
        error instanceof Error ? error : new Error('Failed to post to Misskey'),
      );
    }
  }

  async onValidateFileSubmission(
    postData: PostData<MisskeyFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<MisskeyFileSubmission>();

    const descLength = postData.options.description?.length || 0;
    if (descLength > this.maxNoteTextLength) {
      validator.error(
        'validation.description.max-length',
        {
          currentLength: descLength,
          maxLength: this.maxNoteTextLength,
        },
        'description',
      );
    }

    return validator.result;
  }

  // ========================================================================
  // Message Submission
  // ========================================================================

  createMessageModel(): MisskeyMessageSubmission {
    return new MisskeyMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<MisskeyMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const { accessToken, instanceUrl } = this.websiteDataStore.getData();
    if (!accessToken || !instanceUrl) {
      return PostResponse.fromWebsite(this).withException(
        new Error('Misskey is not logged in'),
      );
    }

    try {
      // Build description with tags
      let description = postData.options.description || '';
      const tags = postData.options.tags || [];
      if (tags.length > 0) {
        const processedTags = tags
          .map((tag) => this.createMessageModel().processTag(tag))
          .filter((tag) => !!tag)
          .join(' ');
        if (processedTags) {
          description = description
            ? `${description}\n\n${processedTags}`
            : processedTags;
        }
      }

      const note = await MisskeyApiService.createNote(
        instanceUrl,
        accessToken,
        {
          text: description,
          visibility: postData.options.visibility || 'public',
          cw: postData.options.cw || undefined,
          localOnly: postData.options.localOnly || false,
        },
      );

      const sourceUrl =
        note.url || note.uri || `https://${instanceUrl}/notes/${note.id}`;

      return PostResponse.fromWebsite(this).withSourceUrl(sourceUrl);
    } catch (error) {
      this.logger.error('Failed to post message to Misskey', error);
      return PostResponse.fromWebsite(this).withException(
        error instanceof Error ? error : new Error('Failed to post to Misskey'),
      );
    }
  }

  async onValidateMessageSubmission(
    postData: PostData<MisskeyMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<MisskeyMessageSubmission>();

    const descLength = postData.options.description?.length || 0;
    if (descLength > this.maxNoteTextLength) {
      validator.error(
        'validation.description.max-length',
        {
          currentLength: descLength,
          maxLength: this.maxNoteTextLength,
        },
        'description',
      );
    }

    return validator.result;
  }
}
