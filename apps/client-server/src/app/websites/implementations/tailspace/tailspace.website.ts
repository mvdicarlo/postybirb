import {
  ImageResizeProps,
  IPostResponse,
  LoginResult,
  OAuthRouteHandlers,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
  TailspaceAccountData,
  TailspaceOAuthRoutes,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import { TailspaceFileSubmission } from './models/tailspace-file-submission';
import { TailspaceMessageSubmission } from './models/tailspace-message-submission';

interface TailspaceResponse<T> {
  success: boolean;
  error: string | null;
  data?: T;
}

interface TailspaceMe {
  username: string;
  artistName: string | null;
  comics: Array<{ id: number; name: string; canAddPages: boolean }>;
}

interface TailspaceUpload {
  uploadId: string;
  uploadUrl: string;
}

interface TailspaceCreateResult {
  url?: string | null;
}

type TailspaceFormData = Parameters<PostBuilder['withData']>[0];

const NEW_POST_OPTION = { value: '', label: 'None (create a post)' };

@WebsiteMetadata({ name: 'tailspace', displayName: 'Tailspace' })
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  acceptedFileSizes: { '*': 50 * 1024 * 1024 },
  // Tailspace takes up to 50 uploads per post or comic-page request.
  fileBatchSize: 50,
})
export default class Tailspace
  extends Website<TailspaceAccountData>
  implements
    FileWebsite<TailspaceFileSubmission>,
    MessageWebsite<TailspaceMessageSubmission>,
    OAuthWebsite<TailspaceOAuthRoutes>
{
  protected BASE_URL = 'https://tailspace.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TailspaceAccountData> =
    { apiKey: false, username: true, comics: true };

  private getHeaders(apiKey: string) {
    return {
      'X-Api-Key': apiKey,
      // Lets Tailspace tell this module apart from the Custom website.
      'X-Api-Client': 'postybirb-tailspace',
      Accept: 'application/json',
    };
  }

  private async fetchMe(apiKey: string): Promise<TailspaceMe | undefined> {
    const response = await this.platform.http.get<
      TailspaceResponse<TailspaceMe>
    >(`${this.BASE_URL}/api/v1/me`, {
      partition: this.accountId,
      headers: this.getHeaders(apiKey),
    });
    if (response.statusCode !== 200 || !response.body?.success) {
      return undefined;
    }
    return response.body.data;
  }

  private async saveAccountData(me: TailspaceMe, apiKey: string) {
    await this.setWebsiteData({
      apiKey,
      username: me.username,
      comics: [
        NEW_POST_OPTION,
        ...me.comics
          .filter((comic) => comic.canAddPages)
          .map((comic) => ({ value: String(comic.id), label: comic.name })),
      ],
    });
  }

  public async onLogin(): Promise<LoginResult> {
    const { apiKey } = this.websiteDataStore.getData();
    if (!apiKey) return { loggedIn: false };

    try {
      const me = await this.fetchMe(apiKey);
      if (!me) return { loggedIn: false };
      await this.saveAccountData(me, apiKey);
      return { loggedIn: true, username: me.artistName ?? me.username };
    } catch (error) {
      this.logger.withError(error).error('Failed to log in to Tailspace');
      return { loggedIn: false };
    }
  }

  onAuthRoute: OAuthRouteHandlers<TailspaceOAuthRoutes> = {
    login: async ({ apiKey }) => {
      const key = apiKey?.trim();
      if (!key) return { result: false };

      try {
        const me = await this.fetchMe(key);
        if (!me) return { result: false };
        await this.saveAccountData(me, key);
        const state = await this.login();
        return { result: state.isLoggedIn };
      } catch (error) {
        this.logger.withError(error).error('Tailspace login failed');
        return { result: false };
      }
    },
  };

  createFileModel(): TailspaceFileSubmission {
    return new TailspaceFileSubmission();
  }

  createMessageModel(): TailspaceMessageSubmission {
    return new TailspaceMessageSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  private getPostFields(
    options:
      | PostData<TailspaceFileSubmission>['options']
      | PostData<TailspaceMessageSubmission>['options'],
  ): TailspaceFormData {
    return {
      title: options.title,
      description: options.description,
      tags: options.tags,
      rating: {
        [SubmissionRating.GENERAL]: 'general',
        [SubmissionRating.MATURE]: 'mature',
        [SubmissionRating.ADULT]: 'explicit',
        [SubmissionRating.EXTREME]: 'explicit',
      }[options.rating],
      allowComments: options.allowComments ?? true,
    };
  }

  private errorFromResponse(
    response: { statusCode: number; body?: { error?: string | null } },
    action: string,
  ): Error {
    return new Error(
      response.body?.error ||
        `Tailspace ${action} failed with status ${response.statusCode}`,
    );
  }

  /**
   * Puts the files straight into Tailspace's storage through signed URLs, so a
   * batch is never limited by request size. Returns the upload ids, in order.
   */
  private async uploadFiles(
    apiKey: string,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<string[]> {
    cancellationToken.throwIfAborted();
    const prepared = await this.platform.http.post<
      TailspaceResponse<{ uploads: TailspaceUpload[] }>
    >(`${this.BASE_URL}/api/v1/uploads`, {
      partition: this.accountId,
      type: 'json',
      headers: this.getHeaders(apiKey),
      data: {
        files: files.map((file) => ({
          fileName: file.fileName,
          fileSize: file.buffer.length,
          contentType: file.mimeType,
        })),
      },
    });
    const uploads = prepared.body?.data?.uploads;
    if (
      prepared.statusCode !== 200 ||
      !prepared.body?.success ||
      uploads?.length !== files.length
    ) {
      throw this.errorFromResponse(prepared, 'upload');
    }

    for (const [index, upload] of uploads.entries()) {
      cancellationToken.throwIfAborted();
      const put = await this.platform.http.put<unknown>(upload.uploadUrl, {
        type: 'binary',
        data: files[index].buffer,
      });
      if (put.statusCode !== 200) {
        throw new Error(
          `Uploading ${files[index].fileName} to Tailspace failed with status ${put.statusCode}`,
        );
      }
    }
    return uploads.map((upload) => upload.uploadId);
  }

  private async create(
    path: string,
    fields: TailspaceFormData,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    const result = PostResponse.fromWebsite(this);
    const { apiKey } = this.websiteDataStore.getData();
    if (!apiKey) {
      return result.withException(new Error('Not logged in to Tailspace'));
    }

    const data =
      files.length > 0
        ? {
            ...fields,
            uploadId: await this.uploadFiles(apiKey, files, cancellationToken),
            fileName: files.map((file) => file.fileName),
          }
        : fields;

    cancellationToken.throwIfAborted();
    const response = await this.platform.http.post<
      TailspaceResponse<TailspaceCreateResult>
    >(`${this.BASE_URL}${path}`, {
      partition: this.accountId,
      type: 'multipart',
      headers: this.getHeaders(apiKey),
      data: new PostBuilder(this, cancellationToken)
        .asMultipart()
        .withData(data)
        .build(),
    });

    if (response.statusCode !== 200 || !response.body?.success) {
      return result
        .withAdditionalInfo({
          statusCode: response.statusCode,
          body: response.body,
        })
        .withException(this.errorFromResponse(response, 'post'));
    }
    return result
      .withSourceUrl(response.body.data?.url ?? undefined)
      .withMessage('Posted to Tailspace');
  }

  async onPostFileSubmission(
    postData: PostData<TailspaceFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    const comicId = postData.options.comic?.trim();
    if (comicId) {
      return this.create(
        `/api/v1/comics/${encodeURIComponent(comicId)}/pages`,
        {},
        files,
        cancellationToken,
      );
    }
    return this.create(
      '/api/v1/posts',
      this.getPostFields(postData.options),
      files,
      cancellationToken,
    );
  }

  async onPostMessageSubmission(
    postData: PostData<TailspaceMessageSubmission>,
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    return this.create(
      '/api/v1/posts',
      this.getPostFields(postData.options),
      [],
      cancellationToken,
    );
  }

  async onValidateFileSubmission(
    postData: PostData<TailspaceFileSubmission>,
  ): Promise<SimpleValidationResult<TailspaceFileSubmission>> {
    const validator = this.createValidator<TailspaceFileSubmission>();
    const comicId = postData.options.comic?.trim();

    if (!comicId) {
      if (!postData.options.title?.trim()) {
        validator.error('validation.field.required', {}, 'title');
      }
      return validator.result;
    }

    const comics = this.websiteDataStore.getData().comics ?? [];
    if (comics.some((comic) => comic.value === comicId)) {
      validator.warning(
        'validation.file.tailspace.comic-ignores-post-fields',
        {},
        'comic',
      );
    } else {
      validator.error(
        'validation.file.tailspace.comic-unavailable',
        {},
        'comic',
      );
    }
    return validator.result;
  }

  async onValidateMessageSubmission(): Promise<
    SimpleValidationResult<TailspaceMessageSubmission>
  > {
    return this.createValidator<TailspaceMessageSubmission>().result;
  }
}
