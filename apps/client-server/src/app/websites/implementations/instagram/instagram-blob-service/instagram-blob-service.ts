import { Logger, PostyBirbLogger } from '@postybirb/logger';

const FUNCTION_BASE_URL =
  process.env.POSTYBIRB_CLOUD_URL || 'https://postybirb.azurewebsites.net/api';

interface UploadResponse {
  url: string;
  blobName: string;
}

/**
 * Temporary blob storage for Instagram image uploads.
 * Uploads images via the PostyBirb cloud server Azure Function
 * so Instagram's API can cURL them.
 * Blobs are auto-deleted by Azure Lifecycle Management policy.
 */
export class InstagramBlobService {
  private static loggerInstance: PostyBirbLogger;

  private static get logger(): PostyBirbLogger {
    if (!InstagramBlobService.loggerInstance) {
      InstagramBlobService.loggerInstance = Logger('InstagramBlobService');
    }
    return InstagramBlobService.loggerInstance;
  }

  /**
   * Upload a file buffer via the cloud server function.
   * @returns The public URL of the uploaded blob.
   */
  static async upload(
    buffer: Buffer,
    mimeType: string,
  ): Promise<UploadResponse> {
    const response = await fetch(`${FUNCTION_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to upload to cloud server: ${response.status} ${errorBody}`,
      );
    }

    const data = (await response.json()) as UploadResponse;
    if (!data.url) {
      throw new Error('Cloud server did not return a URL');
    }

    InstagramBlobService.logger.info(`Uploaded blob: ${data.blobName}`);
    return data;
  }
}
