import { FormFile, Http } from '@postybirb/http';
import { Logger } from '@postybirb/logger';

const logger = Logger('MisskeyApiService');

/**
 * Ensures the response body is parsed as JSON.
 * Http.post only auto-parses when content-type is application/json.
 * Some Misskey instances may return different content-types.
 */
function ensureJson<T>(body: T | string): T {
  if (typeof body === 'string') {
    return JSON.parse(body) as T;
  }
  return body;
}

interface MisskeyUser {
  id: string;
  username: string;
  name?: string;
  policies?: MisskeyPolicies;
}

export interface MisskeyPolicies {
  driveCapacityMb?: number;
  maxFileSizeMb?: number;
  uploadableFileTypes?: string[];
  pinLimit?: number;
  canPublicNote?: boolean;
}

interface MisskeyMeta {
  maxNoteTextLength?: number;
  driveCapacityPerLocalUserMb?: number;
  version?: string;
}

interface MisskeyDriveFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface MisskeyNote {
  id: string;
  createdAt: string;
  text?: string;
  uri?: string;
  url?: string;
  user: MisskeyUser;
}

export class MisskeyApiService {
  /**
   * Build the MiAuth authorization URL.
   */
  static buildMiAuthUrl(
    instanceUrl: string,
    sessionId: string,
    appName: string,
    permissions: string[],
  ): string {
    const params = new URLSearchParams({
      name: appName,
      permission: permissions.join(','),
    });
    return `https://${instanceUrl}/miauth/${sessionId}?${params.toString()}`;
  }

  /**
   * Check MiAuth session and retrieve access token.
   * POST /api/miauth/{sessionId}/check
   */
  static async checkMiAuth(
    instanceUrl: string,
    sessionId: string,
  ): Promise<{ token: string; user: MisskeyUser }> {
    const res = await Http.post<{ token: string; user: MisskeyUser }>(
      `https://${instanceUrl}/api/miauth/${sessionId}/check`,
      { type: 'json', data: {} },
    );

    const body = ensureJson(res.body);
    if (!body?.token) {
      throw new Error('MiAuth check failed: no token received');
    }

    return body;
  }

  /**
   * Verify credentials by fetching the current user's account info.
   * POST /api/i
   */
  static async verifyCredentials(
    instanceUrl: string,
    token: string,
  ): Promise<MisskeyUser> {
    const res = await Http.post<MisskeyUser>(
      `https://${instanceUrl}/api/i`,
      { type: 'json', data: { i: token } },
    );

    const body = ensureJson(res.body);
    if (!body?.username) {
      throw new Error('Failed to verify Misskey credentials');
    }

    return body;
  }

  /**
   * Fetch instance metadata.
   * POST /api/meta
   */
  static async getInstanceMeta(
    instanceUrl: string,
  ): Promise<MisskeyMeta> {
    const res = await Http.post<MisskeyMeta>(
      `https://${instanceUrl}/api/meta`,
      { type: 'json', data: { detail: true } },
    );

    return ensureJson(res.body) ?? {};
  }

  /**
   * Upload a file to the user's Misskey Drive.
   * POST /api/drive/files/create (multipart)
   */
  static async uploadFile(
    instanceUrl: string,
    token: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    options?: { comment?: string; isSensitive?: boolean },
  ): Promise<MisskeyDriveFile> {
    const data: Record<string, unknown> = {
      i: token,
      file: new FormFile(file, {
        filename: fileName,
        contentType: mimeType,
      }),
      name: fileName,
    };

    if (options?.comment) {
      data.comment = options.comment;
    }

    if (options?.isSensitive) {
      data.isSensitive = 'true';
    }

    const res = await Http.post<MisskeyDriveFile>(
      `https://${instanceUrl}/api/drive/files/create`,
      { type: 'multipart', data },
    );

    const body = ensureJson(res.body);
    if (!body?.id) {
      logger
        .withMetadata({ statusCode: res.statusCode, body })
        .error('Misskey Drive upload failed');
      throw new Error(
        `Failed to upload file to Misskey Drive: ${
          (body as unknown as Record<string, unknown>)?.error
            ? JSON.stringify((body as unknown as Record<string, unknown>).error)
            : `HTTP ${res.statusCode}`
        }`,
      );
    }

    logger
      .withMetadata({ fileId: body.id, fileName })
      .info('File uploaded to Misskey Drive');

    return body;
  }

  /**
   * Create a note (post) on Misskey.
   * POST /api/notes/create
   */
  static async createNote(
    instanceUrl: string,
    token: string,
    options: {
      text?: string;
      fileIds?: string[];
      visibility?: string;
      cw?: string;
      localOnly?: boolean;
    },
  ): Promise<MisskeyNote> {
    const data: Record<string, unknown> = {
      i: token,
      visibility: options.visibility ?? 'public',
    };

    if (options.text) {
      data.text = options.text;
    }

    if (options.fileIds?.length) {
      data.fileIds = options.fileIds;
    }

    if (options.cw) {
      data.cw = options.cw;
    }

    if (options.localOnly) {
      data.localOnly = true;
    }

    const res = await Http.post<{ createdNote: MisskeyNote }>(
      `https://${instanceUrl}/api/notes/create`,
      { type: 'json', data },
    );

    const body = ensureJson(res.body);
    if (!body?.createdNote?.id) {
      throw new Error('Failed to create note on Misskey');
    }

    return body.createdNote;
  }
}
