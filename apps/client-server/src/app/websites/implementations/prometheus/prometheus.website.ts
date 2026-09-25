import { FormFile, HttpResponse } from '@postybirb/http/types';
import {
  ImageResizeProps,
  IPostResponse,
  LoginResult,
  OAuthRouteHandlers,
  PostData,
  PostResponse,
  PrometheusAccountData,
  PrometheusOAuthRoutes,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import { extname } from 'path';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import { PrometheusFileSubmission } from './models/prometheus-file-submission';

interface PrometheusLoginResponse {
  ok: boolean;
  username: string;
  folders: Array<{ id: string; name: string; visibility: string }>;
  pools: Array<{ id: string; name: string; visibility: string }>;
}

interface PrometheusUploadResponse {
  message?: string;
  error?: string;
  entry_id?: string;
  sub_entry_count?: number;
  sub_entry_ids?: string[];
}

interface PrometheusMultipartResponse extends PrometheusUploadResponse {
  ok?: boolean;
  token?: string;
  part_size?: number;
  max_parts?: number;
  max_file_size?: number;
  etag?: string;
}

const chunkedUploadThreshold = 32 * 1024 * 1024;
const entryIdPattern = /^[A-Za-z0-9]{32}$/;
const acceptedExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.mkv',
  '.flv',
  '.wmv',
  '.mpg',
  '.mpeg',
  '.mp3',
  '.ogg',
  '.wav',
  '.m4a',
  '.aac',
  '.txt',
  '.pdf',
  '.doc',
  '.docx',
  '.odt',
  '.rtf',
  '.psd',
  '.clip',
]);
type PrometheusFormData = Parameters<PostBuilder['withData']>[0];

@WebsiteMetadata({ name: 'prometheus', displayName: 'Prometheus' })
@CustomLoginFlow()
@SupportsFiles({
  fileBatchSize: 100,
  acceptsExternalSourceUrls: true,
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/x-flv',
    'video/x-ms-wmv',
    'video/mpeg',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/rtf',
    'image/vnd.adobe.photoshop',
    'application/octet-stream',
  ],
  acceptedFileSizes: { '*': 5368709120 },
})
export default class Prometheus
  extends Website<PrometheusAccountData>
  implements
    FileWebsite<PrometheusFileSubmission>,
    OAuthWebsite<PrometheusOAuthRoutes>
{
  protected BASE_URL = 'https://prometheus-archive.net';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PrometheusAccountData> =
    { username: true, apiKey: false, folders: true, pools: true };

  private getAuthHeaders(username: string, apiKey: string) {
    return {
      'X-Username': username,
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    };
  }

  private async checkCredentials(username: string, apiKey: string) {
    const response = await this.platform.http.get<PrometheusLoginResponse>(
      `${this.BASE_URL}/postybirb`,
      {
        partition: this.accountId,
        headers: this.getAuthHeaders(username, apiKey),
      },
    );
    if (
      response.statusCode !== 200 ||
      response.body?.ok !== true ||
      !response.body.username ||
      !Array.isArray(response.body.folders) ||
      !Array.isArray(response.body.pools)
    ) {
      return undefined;
    }
    return response.body;
  }

  private async saveAccountData(user: PrometheusLoginResponse, apiKey: string) {
    await this.setWebsiteData({
      username: user.username,
      apiKey,
      folders: user.folders.map((folder) => ({
        value: folder.id,
        label: folder.name,
      })),
      pools: user.pools.map((pool) => ({ value: pool.id, label: pool.name })),
    });
  }

  public async onLogin(): Promise<LoginResult> {
    const { username, apiKey } = this.websiteDataStore.getData();
    if (!username || !apiKey) return { loggedIn: false };

    try {
      const user = await this.checkCredentials(username, apiKey);
      if (!user) return { loggedIn: false };
      await this.saveAccountData(user, apiKey);
      return { loggedIn: true, username: user.username };
    } catch (error) {
      this.logger.withError(error).error('Failed to log in to Prometheus');
      return { loggedIn: false };
    }
  }

  onAuthRoute: OAuthRouteHandlers<PrometheusOAuthRoutes> = {
    login: async (data) => {
      const username = data.username?.trim();
      const apiKey = data.apiKey?.trim();
      if (!username || !apiKey) return { result: false };

      try {
        const user = await this.checkCredentials(username, apiKey);
        if (!user) return { result: false };
        await this.saveAccountData(user, apiKey);
        const state = await this.login();
        return { result: state.isLoggedIn };
      } catch (error) {
        this.logger.withError(error).error('Prometheus login failed');
        return { result: false };
      }
    },
  };

  createFileModel(): PrometheusFileSubmission {
    return new PrometheusFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  private getUploadData(
    postData: PostData<PrometheusFileSubmission>,
    files: PostingFile[],
    parentId?: string,
  ): PrometheusFormData {
    const { options } = postData;
    const metadata = {
      description: options.description,
      tags: JSON.stringify(options.tags),
      rating: {
        [SubmissionRating.GENERAL]: 'General',
        [SubmissionRating.MATURE]: 'Mature',
        [SubmissionRating.ADULT]: 'Adult',
        [SubmissionRating.EXTREME]: 'Extreme',
      }[options.rating],
    };
    if (parentId) return { ...metadata, sub_entry_of: parentId };

    const mirrors = Array.from(
      new Set(files.flatMap((file) => file.metadata?.sourceUrls ?? [])),
    ).filter((url) => {
      try {
        return ['http:', 'https:'].includes(new URL(url).protocol);
      } catch {
        return false;
      }
    });

    return {
      ...metadata,
      title: options.title,
      visibility: options.visibility || 'inherit',
      display_on_gallery: options.displayOnGallery ?? true,
      disclaimer: options.contentWarning,
      access_password:
        options.visibility === 'password' ? options.accessPassword : undefined,
      folder_ids: JSON.stringify(options.folders ?? []),
      pool_ids: JSON.stringify(options.pools ?? []),
      mirrors: JSON.stringify(mirrors.slice(0, 10)),
    };
  }

  private async sendMultipart<Response>(
    endpoint: string,
    data: PrometheusFormData,
    cancellationToken: CancellationToken,
  ): Promise<HttpResponse<Response>> {
    cancellationToken.throwIfAborted();
    const { username, apiKey } = this.websiteDataStore.getData();
    if (!username || !apiKey) throw new Error('Not logged in to Prometheus');
    return this.platform.http.post<Response>(
      `${this.BASE_URL}/postybirb${endpoint}`,
      {
        partition: this.accountId,
        type: 'multipart',
        headers: this.getAuthHeaders(username, apiKey),
        data: new PostBuilder(this, cancellationToken)
          .asMultipart()
          .withData(data)
          .build(),
      },
    );
  }

  private async uploadFile(
    file: PostingFile,
    data: PrometheusFormData,
    cancellationToken: CancellationToken,
    includeThumbnail: boolean,
  ): Promise<HttpResponse<PrometheusUploadResponse>> {
    const thumbnail = includeThumbnail
      ? file.thumbnailToPostFormat()
      : undefined;
    const uploadDirectly = () =>
      this.sendMultipart<PrometheusUploadResponse>(
        '',
        { ...data, file: file.toPostFormat(), thumbnail },
        cancellationToken,
      );
    if (file.buffer.length <= chunkedUploadThreshold) return uploadDirectly();

    const start = await this.sendMultipart<PrometheusMultipartResponse>(
      '/multipart/start',
      {
        ...data,
        filename: file.fileName,
        file_size: file.buffer.length,
        content_type: file.mimeType,
      },
      cancellationToken,
    );
    if (start.statusCode === 400 && !start.body?.token) {
      return uploadDirectly();
    }
    if (start.statusCode >= 300 || !start.body?.ok || !start.body.token) {
      return start;
    }

    const {
      token,
      part_size: partSize,
      max_parts: maxParts,
      max_file_size: maxFileSize,
    } = start.body;
    let completed = false;
    try {
      if (
        typeof partSize !== 'number' ||
        !Number.isSafeInteger(partSize) ||
        partSize <= 0 ||
        typeof maxParts !== 'number' ||
        !Number.isSafeInteger(maxParts) ||
        maxParts <= 0 ||
        typeof maxFileSize !== 'number' ||
        !Number.isSafeInteger(maxFileSize) ||
        maxFileSize <= 0 ||
        Math.ceil(file.buffer.length / partSize) > maxParts ||
        file.buffer.length > maxFileSize
      ) {
        throw new Error('Invalid Prometheus chunked upload limits');
      }

      const parts: Array<{ part_number: number; etag: string }> = [];
      for (let offset = 0; offset < file.buffer.length; offset += partSize) {
        const partNumber = parts.length + 1;
        const part = await this.sendMultipart<PrometheusMultipartResponse>(
          '/multipart/upload-part',
          {
            token,
            part_number: partNumber,
            chunk: new FormFile(
              file.buffer.subarray(offset, offset + partSize),
              {
                filename: file.fileName,
                contentType: file.mimeType,
              },
            ),
          },
          cancellationToken,
        );
        if (part.statusCode >= 300 || !part.body?.ok || !part.body.etag) {
          throw new Error(
            part.body?.error || 'Failed to upload Prometheus chunk',
          );
        }
        parts.push({ part_number: partNumber, etag: part.body.etag });
      }

      const response = await this.sendMultipart<PrometheusUploadResponse>(
        '/multipart/complete',
        { token, parts: JSON.stringify(parts), thumbnail },
        cancellationToken,
      );
      completed = response.statusCode === 201;
      return response;
    } finally {
      if (!completed) {
        try {
          await this.sendMultipart(
            '/multipart/abort',
            { token },
            new CancellationToken(),
          );
        } catch (error) {
          this.logger
            .withError(error)
            .warn('Failed to abort Prometheus upload');
        }
      }
    }
  }

  async onPostFileSubmission(
    postData: PostData<PrometheusFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    const result = PostResponse.fromWebsite(this);
    const { username, apiKey } = this.websiteDataStore.getData();
    if (!username || !apiKey) {
      return result.withException(new Error('Not logged in to Prometheus'));
    }
    if (!files.length) {
      return result.withException(new Error('Prometheus requires a file'));
    }
    const unsupportedFile = files.find(
      (file) => !acceptedExtensions.has(extname(file.fileName).toLowerCase()),
    );
    if (unsupportedFile) {
      return result.withException(
        new Error(
          `Unsupported Prometheus file type: ${unsupportedFile.fileName}`,
        ),
      );
    }

    const validation = await this.onValidateFileSubmission(postData);
    if (validation.errors.length) {
      return result
        .withException(new Error('Invalid Prometheus submission options'))
        .withAdditionalInfo(validation.errors);
    }

    let parentId = postData.options.subEntryOf?.trim() || undefined;
    if (parentId) result.withSourceUrl(`${this.BASE_URL}/entry/${parentId}`);

    const handleResponse = (
      response: HttpResponse<PrometheusUploadResponse>,
    ) => {
      const entryId = response.body?.entry_id;
      if (entryId && entryIdPattern.test(entryId)) {
        parentId = entryId;
        result.withSourceUrl(`${this.BASE_URL}/entry/${entryId}`);
      }
      if (
        response.statusCode !== 201 ||
        response.body?.message !== 'success' ||
        !entryId ||
        !entryIdPattern.test(entryId)
      ) {
        result.withAdditionalInfo({
          statusCode: response.statusCode,
          body: response.body,
        });
        throw new Error(
          response.body?.error || 'Failed to upload to Prometheus',
        );
      }
    };

    try {
      if (
        files.reduce((size, file) => size + file.buffer.length, 0) <=
        chunkedUploadThreshold
      ) {
        handleResponse(
          await this.sendMultipart<PrometheusUploadResponse>(
            '',
            {
              ...this.getUploadData(postData, files, parentId),
              file: files.map((file) => file.toPostFormat()),
              thumbnail: parentId
                ? undefined
                : files[0].thumbnailToPostFormat(),
            },
            cancellationToken,
          ),
        );
      } else {
        for (const file of files) {
          handleResponse(
            await this.uploadFile(
              file,
              this.getUploadData(postData, files, parentId),
              cancellationToken,
              !parentId,
            ),
          );
        }
      }
      return result.withMessage('File posted successfully');
    } catch (error) {
      return result.withException(error);
    }
  }

  async onValidateFileSubmission(
    postData: PostData<PrometheusFileSubmission>,
  ): Promise<SimpleValidationResult<PrometheusFileSubmission>> {
    const result: SimpleValidationResult<PrometheusFileSubmission> = {
      errors: [],
      warnings: [],
    };
    const { options } = postData;
    const parentId = options.subEntryOf?.trim();
    const addError = (
      field: keyof PrometheusFileSubmission,
      message: string,
    ) => {
      result.errors.push({
        field,
        id: 'validation.failed',
        values: { message },
      });
    };

    if (parentId && !entryIdPattern.test(parentId)) {
      addError(
        'subEntryOf',
        'Parent entry IDs must contain 32 letters or digits.',
      );
    }
    if (!parentId) {
      if (
        options.visibility === 'password' &&
        !options.accessPassword?.trim()
      ) {
        result.errors.push({
          field: 'accessPassword',
          id: 'validation.field.required',
          values: {},
        });
      }
      for (const field of ['folders', 'pools'] as const) {
        if ((options[field]?.length ?? 0) > 100) {
          addError(field, 'Prometheus accepts at most 100 folders or pools.');
        }
      }
      if ((options.contentWarning?.length ?? 0) > 1000) {
        addError(
          'contentWarning',
          'Prometheus popup text cannot exceed 1,000 characters.',
        );
      }
    }
    return result;
  }
}
