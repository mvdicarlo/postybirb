import { SelectOption } from '@postybirb/form-builder';
import { FormFile, HttpResponse } from '@postybirb/http/types';
import {
  Adore34AccountData,
  Adore34OAuthRoutes,
  ImageResizeProps,
  IPostResponse,
  LoginResult,
  OAuthRouteHandlers,
  PostData,
  PostFields,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import { createHash } from 'crypto';
import { chunk } from 'lodash';
import { setTimeout as delay } from 'timers/promises';
import { CancellationToken } from '../../../posting/cancellation-token';
import {
  PostingFile,
  ThumbnailOptions,
} from '../../../posting/models/posting-file';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import { Adore34FileSubmission } from './models/adore34-file-submission';
import { Adore34MessageSubmission } from './models/adore34-message-submission';

interface Adore34Tier {
  _id: string;
  name: string;
  access?: { isArchived?: boolean; isHidden?: boolean };
  archivedAt?: string | null;
}

interface Adore34Upload {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
}

interface Adore34ChunkResponse {
  received: number;
  total: number;
  errorCode?: string;
}

type Adore34PostOptions = PostFields<Adore34MessageSubmission> & {
  useThumbnailAsPreview?: boolean;
};

type Adore34MediaIds = {
  imageIds: string[];
  videoIds: string[];
  audioIds: string[];
  comicIds: string[];
  previewImageIds: string[];
};

interface Adore34MediaType {
  fieldName: 'images' | 'videos' | 'audio' | 'comics';
  idField: Exclude<keyof Adore34MediaIds, 'previewImageIds'>;
  mimeTypes: string[];
  maxSize: number;
  maxCount: number;
}

const mediaTypes: Adore34MediaType[] = [
  {
    fieldName: 'images',
    idField: 'imageIds',
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/heic',
      'image/heif',
    ],
    maxSize: 25 * 1024 ** 2,
    maxCount: 10,
  },
  {
    fieldName: 'videos',
    idField: 'videoIds',
    mimeTypes: [
      'video/mp4',
      'video/mpeg',
      'video/ogg',
      'video/quicktime',
      'video/mov',
      'video/webm',
    ],
    maxSize: 6 * 1024 ** 3,
    maxCount: 5,
  },
  {
    fieldName: 'audio',
    idField: 'audioIds',
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    maxSize: 15 * 1024 ** 2,
    maxCount: 1,
  },
  {
    fieldName: 'comics',
    idField: 'comicIds',
    mimeTypes: ['application/pdf', 'application/epub+zip'],
    maxSize: 500 * 1024 ** 2,
    maxCount: 1,
  },
];
const mediaByMimeType: Record<string, Adore34MediaType> = Object.fromEntries(
  mediaTypes.flatMap((media) =>
    media.mimeTypes.map((mimeType) => [mimeType, media]),
  ),
);
const fileBatchSize = 16;
const objectIdPattern = /^[a-f\d]{24}$/i;
const apiKeyPattern = /^adore_ak_\S+$/;

@WebsiteMetadata({ name: 'adore34', displayName: 'Adore34' })
@CustomLoginFlow()
@SupportsFiles({
  fileBatchSize,
  acceptedMimeTypes: mediaTypes.flatMap((media) => media.mimeTypes),
  acceptedFileSizes: Object.fromEntries(
    mediaTypes.flatMap((media) =>
      media.mimeTypes.map((mimeType) => [mimeType, media.maxSize]),
    ),
  ),
})
@DisableAds()
export default class Adore34
  extends Website<Adore34AccountData>
  implements
  FileWebsite<Adore34FileSubmission>,
  MessageWebsite<Adore34MessageSubmission>,
  OAuthWebsite<Adore34OAuthRoutes> {
  protected BASE_URL = 'https://api.adore34.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<Adore34AccountData> =
    { apiKey: false, tiers: true };

  private getAuthHeaders(apiKey: string): Record<string, string> {
    return { Authorization: apiKey, Accept: 'application/json' };
  }

  private failResponse(
    response: HttpResponse<unknown>,
    stage: string,
    message: string,
  ): never {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw PostResponse.fromWebsite(this)
      .atStage(stage)
      .withException(new Error(`${message} (HTTP ${response.statusCode})`))
      .withAdditionalInfo(response.body);
  }

  private checkResponse(response: HttpResponse<unknown>, stage: string): void {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      this.failResponse(response, stage, `Adore34 ${stage} failed`);
    }
  }

  private async getTiers(apiKey: string): Promise<SelectOption[] | undefined> {
    const tiers: SelectOption[] = [];
    const seen = new Set<string>();
    const limit = 200;
    for (let offset = 0; ; offset += limit) {
      const response = await this.platform.http.get<Adore34Tier[]>(
        `${this.BASE_URL}/creator-tiers`,
        {
          partition: this.accountId,
          headers: this.getAuthHeaders(apiKey),
          queryParameters: { limit, offset },
        },
      );
      if (response.statusCode === 401 || response.statusCode === 403) {
        this.logger.warn(
          `Adore34 rejected the API key or tiers:read scope (HTTP ${response.statusCode})`,
        );
        return undefined;
      }
      this.checkResponse(response, 'loading tiers');
      if (!Array.isArray(response.body)) {
        this.failResponse(response, 'loading tiers', 'Invalid tier list');
      }
      for (const tier of response.body) {
        if (!tier || typeof tier !== 'object') {
          this.failResponse(response, 'loading tiers', 'Invalid tier data');
        }
        const { _id: id, name } = tier;
        if (
          typeof id !== 'string' ||
          !objectIdPattern.test(id) ||
          typeof name !== 'string' ||
          !name.trim() ||
          seen.has(id)
        ) {
          this.failResponse(response, 'loading tiers', 'Invalid tier data');
        }
        seen.add(id);
        if (
          !tier.access?.isArchived &&
          !tier.access?.isHidden &&
          !tier.archivedAt
        ) {
          tiers.push({ value: id, label: name });
        }
      }
      if (response.body.length < limit) return tiers;
    }
  }

  public async onLogin(): Promise<LoginResult> {
    const { apiKey } = this.websiteDataStore.getData();
    if (!apiKey) return { loggedIn: false };
    if (!apiKeyPattern.test(apiKey)) {
      this.logger.warn('An Adore34 personal API key is required');
      return { loggedIn: false };
    }
    const tiers = await this.getTiers(apiKey);
    if (!tiers) return { loggedIn: false };
    await this.setWebsiteData({ apiKey, tiers });
    // Scoped API keys do not expose profile data; retain the local account label.
    return { loggedIn: true, username: this.account.name };
  }

  onAuthRoute: OAuthRouteHandlers<Adore34OAuthRoutes> = {
    login: async (data) => {
      const apiKey = typeof data.apiKey === 'string' ? data.apiKey.trim() : '';
      if (!apiKey || !apiKeyPattern.test(apiKey)) {
        this.logger.warn('An Adore34 personal API key is required');
        return { result: false };
      }
      try {
        const tiers = await this.getTiers(apiKey);
        if (!tiers) return { result: false };
        await this.setWebsiteData({ apiKey, tiers });
        const state = await this.login();
        return { result: state.isLoggedIn };
      } catch (error) {
        this.logger.withError(error).error('Failed to log in to Adore34');
        return { result: false };
      }
    },
  };

  createFileModel(): Adore34FileSubmission {
    return new Adore34FileSubmission();
  }

  createMessageModel(): Adore34MessageSubmission {
    return new Adore34MessageSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  private validateOptions(
    options: Adore34PostOptions,
  ): SimpleValidationResult<Adore34FileSubmission> {
    const validator = this.createValidator<Adore34FileSubmission>();
    const error = (
      message: string,
      field?: Parameters<typeof validator.error>[2],
    ) => validator.error('validation.failed', { message }, field);

    if (
      options.visibility === 'tiers' &&
      options.tiers?.some((id) => !objectIdPattern.test(id))
    ) {
      error('Select at least one valid creator tier.', 'tiers');
    }
    if (options.isPurchasable) {
      if (options.visibility === 'all') {
        error('Public Adore34 posts cannot be purchasable.', 'isPurchasable');
      }
      if (
        !Number.isFinite(options.price) ||
        options.price < 3 ||
        options.price > 300
      ) {
        error('Adore34 purchase prices must be 3 to 300 credits.', 'price');
      }
    }
    if (options.useThumbnailAsPreview && options.visibility === 'all') {
      error(
        'Public Adore34 posts cannot include preview images.',
        'useThumbnailAsPreview',
      );
    }
    return validator.result;
  }

  private getMediaCountErrors(files: { mimeType: string }[]): string[] {
    const errors: string[] = [];
    let comicCount = 0;
    for (const media of mediaTypes) {
      const count = files.filter((file) =>
        media.fieldName === 'comics'
          ? media.mimeTypes.includes(file.mimeType)
          : file.mimeType.startsWith(`${media.mimeTypes[0].split('/')[0]}/`),
      ).length;
      if (media.fieldName === 'comics') comicCount = count;
      if (count > media.maxCount) {
        errors.push(
          `Adore34 allows at most ${media.maxCount} ${media.fieldName} per post.`,
        );
      }
    }
    if (comicCount && comicCount !== files.length) {
      errors.push(
        'Adore34 comics cannot be mixed with images, video, or audio.',
      );
    }
    return errors;
  }

  async onValidateFileSubmission(
    postData: PostData<Adore34FileSubmission>,
  ): Promise<SimpleValidationResult<Adore34FileSubmission>> {
    const result = this.validateOptions(postData.options);
    const files = postData.submission.files.filter(
      (file) => !file.metadata.ignoredWebsites.includes(this.accountId),
    );
    for (const batch of chunk(files, fileBatchSize)) {
      const errors = this.getMediaCountErrors(batch);
      if (
        postData.options.useThumbnailAsPreview &&
        batch.filter((file) => file.hasThumbnail).length > 5
      ) {
        errors.push('Adore34 allows at most 5 preview images per post.');
      }
      errors.forEach((message) =>
        result.errors.push({ id: 'validation.failed', values: { message } }),
      );
    }
    return result;
  }

  async onValidateMessageSubmission(
    postData: PostData<Adore34MessageSubmission>,
  ): Promise<SimpleValidationResult<Adore34FileSubmission>> {
    return this.validateOptions(postData.options);
  }

  private async uploadChunk(
    upload: Adore34Upload,
    index: number,
    bytes: Buffer,
    fileName: string,
    apiKey: string,
    cancellationToken: CancellationToken,
  ): Promise<void> {
    const data = {
      chunk: new FormFile(bytes, {
        filename: fileName,
        contentType: 'application/octet-stream',
      }),
      chunkHash: createHash('sha256').update(bytes).digest('hex'),
    };
    for (let attempt = 0; ; attempt++) {
      cancellationToken.throwIfAborted();
      let retryable = true;
      try {
        const response = await this.platform.http.put<Adore34ChunkResponse>(
          `${this.BASE_URL}/upload/${encodeURIComponent(upload.uploadId)}/chunk/${index}`,
          {
            partition: this.accountId,
            headers: this.getAuthHeaders(apiKey),
            type: 'multipart',
            data,
          },
        );
        retryable =
          response.statusCode === 429 ||
          response.statusCode >= 500 ||
          (response.statusCode === 422 &&
            response.body?.errorCode === 'CHUNK_HASH_MISMATCH');
        this.checkResponse(response, `uploading chunk ${index}`);
        if (
          !Number.isSafeInteger(response.body?.received) ||
          response.body.received < index + 1 ||
          response.body.received > upload.totalChunks ||
          response.body.total !== upload.totalChunks
        ) {
          this.failResponse(
            response,
            'uploading chunk',
            'Invalid chunk acknowledgement',
          );
        }
        return;
      } catch (error) {
        cancellationToken.throwIfAborted();
        if (!retryable || attempt >= 2) throw error;
        this.logger
          .withError(error)
          .warn(`Retrying Adore34 chunk ${index} (retry ${attempt + 1})`);
        await delay(500 * 2 ** attempt, undefined, {
          signal: cancellationToken.signal,
        });
      }
    }
  }

  private async uploadFile(
    file: ThumbnailOptions,
    media: Adore34MediaType,
    apiKey: string,
    cancellationToken: CancellationToken,
    activeUploads: Set<string>,
    stagedFiles: Set<string>,
  ): Promise<string> {
    cancellationToken.throwIfAborted();
    const init = await this.platform.http.post<Adore34Upload>(
      `${this.BASE_URL}/upload/init`,
      {
        partition: this.accountId,
        headers: this.getAuthHeaders(apiKey),
        type: 'json',
        data: {
          fileName: file.fileName,
          mimeType: file.mimeType,
          totalSize: file.buffer.length,
          fieldName: media.fieldName,
          uploadContext: 'post',
        },
      },
    );
    this.checkResponse(init, 'initializing upload');
    const upload = init.body;
    if (typeof upload?.uploadId !== 'string' || !upload.uploadId.trim()) {
      this.failResponse(init, 'initializing upload', 'Missing upload ID');
    }
    activeUploads.add(upload.uploadId);
    if (
      !Number.isSafeInteger(upload.chunkSize) ||
      upload.chunkSize <= 0 ||
      upload.chunkSize > 6 * 1024 ** 2 ||
      !Number.isSafeInteger(upload.totalChunks) ||
      upload.totalChunks !== Math.ceil(file.buffer.length / upload.chunkSize)
    ) {
      this.failResponse(
        init,
        'initializing upload',
        'Invalid upload chunk metadata',
      );
    }
    for (let index = 0; index < upload.totalChunks; index++) {
      await this.uploadChunk(
        upload,
        index,
        file.buffer.subarray(
          index * upload.chunkSize,
          (index + 1) * upload.chunkSize,
        ),
        file.fileName,
        apiKey,
        cancellationToken,
      );
    }
    cancellationToken.throwIfAborted();
    const completed = await this.platform.http.post<{ fileId: string }>(
      `${this.BASE_URL}/upload/${encodeURIComponent(upload.uploadId)}/complete`,
      {
        partition: this.accountId,
        headers: this.getAuthHeaders(apiKey),
        type: 'json',
        data: {},
      },
    );
    this.checkResponse(completed, 'completing upload');
    if (
      typeof completed.body?.fileId !== 'string' ||
      !objectIdPattern.test(completed.body.fileId)
    ) {
      this.failResponse(completed, 'completing upload', 'Missing file ID');
    }
    stagedFiles.add(completed.body.fileId);
    activeUploads.delete(upload.uploadId);
    return completed.body.fileId;
  }

  private async cleanupUploads(
    apiKey: string,
    activeUploads: Set<string>,
    stagedFiles: Set<string>,
  ): Promise<void> {
    const paths = [
      ...Array.from(activeUploads, (id) => `/upload/${encodeURIComponent(id)}`),
      ...Array.from(stagedFiles, (id) => `/upload/staging/${id}`),
    ];
    await Promise.all(
      paths.map(async (path) => {
        try {
          const response = await this.platform.network.fetch(
            `${this.BASE_URL}${path}`,
            {
              method: 'DELETE',
              headers: this.getAuthHeaders(apiKey),
              // Cleanup must still run after posting has been cancelled.
              signal: AbortSignal.timeout(30_000),
            },
          );
          if (!response.ok) {
            this.logger.warn(
              `Adore34 cleanup failed for ${path} (HTTP ${response.status})`,
            );
          }
        } catch (error) {
          this.logger
            .withError(error)
            .warn(`Adore34 cleanup failed for ${path}`);
        }
      }),
    );
  }

  private async postSubmission(
    options: Adore34PostOptions,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    const result = PostResponse.fromWebsite(this);
    const { apiKey } = this.websiteDataStore.getData();
    const previews = options.useThumbnailAsPreview
      ? files.flatMap((file) => (file.thumbnail ? [file.thumbnail] : []))
      : [];
    const invalidPreview = previews.find((file) => {
      const media = mediaByMimeType[file.mimeType];
      return (
        !media ||
        media.fieldName !== 'images' ||
        !file.buffer.length ||
        file.buffer.length > media.maxSize
      );
    });
    if (invalidPreview) {
      return result
        .atStage('validation')
        .withException(
          new Error(
            `Unsupported Adore34 preview type or size: ${invalidPreview.fileName}`,
          ),
        );
    }

    const activeUploads = new Set<string>();
    const stagedFiles = new Set<string>();
    const ids: Adore34MediaIds = {
      imageIds: [],
      videoIds: [],
      audioIds: [],
      comicIds: [],
      previewImageIds: [],
    };
    let posted = false;
    try {
      for (const file of [...files, ...previews]) {
        const media = mediaByMimeType[file.mimeType];
        const id = await this.uploadFile(
          file,
          media,
          apiKey,
          cancellationToken,
          activeUploads,
          stagedFiles,
        );
        ids[previews.includes(file) ? 'previewImageIds' : media.idField].push(
          id,
        );
      }
      cancellationToken.throwIfAborted();
      const response = await this.platform.http.post<{
        _id: string; postUrl?: string;
      }>(`${this.BASE_URL}/posts/creators`, {
        partition: this.accountId,
        headers: this.getAuthHeaders(apiKey),
        type: 'json',
        data: {
          title: options.title,
          text: options.description ?? '',
          tags: options.tags,
          scope: {
            type: options.visibility,
            ...(options.visibility === 'tiers'
              ? { tierIds: options.tiers }
              : {}),
            isPurchasable: options.isPurchasable,
            price: options.isPurchasable ? options.price : 0,
          },
          flags: {
            commentsEnabled: options.commentsEnabled,
            notifyFansOnPublish: options.notifyFansOnPublish,
            inspiredBySaga: options.inspiredBySaga,
          },
          fileIds: [],
          ...ids,
        },
      });
      this.checkResponse(response, 'creating post');
      const { _id: createdPostId } = response.body ?? {};
      if (
        typeof createdPostId !== 'string' ||
        !objectIdPattern.test(createdPostId)
      ) {
        this.failResponse(
          response,
          'creating post',
          'Adore34 did not return a post ID. Check Adore34 before retrying',
        );
      }
      posted = true;
      return result
        .withMessage('Post created successfully on Adore34')
        .withSourceUrl(response.body.postUrl)
        .withAdditionalInfo(response.body);
    } catch (error) {
      this.logger.withError(error).error('Failed to post to Adore34');
      return error instanceof PostResponse
        ? error
        : result.withException(error);
    } finally {
      if (!posted)
        await this.cleanupUploads(apiKey, activeUploads, stagedFiles);
    }
  }

  async onPostFileSubmission(
    postData: PostData<Adore34FileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    return this.postSubmission(postData.options, files, cancellationToken);
  }

  async onPostMessageSubmission(
    postData: PostData<Adore34MessageSubmission>,
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    return this.postSubmission(postData.options, [], cancellationToken);
  }
}
