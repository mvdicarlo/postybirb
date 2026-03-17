import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Logger, PostyBirbLogger } from '@postybirb/logger';
import { v4 as uuid } from 'uuid';

const CONNECTION_STRING = '';

const CONTAINER_NAME = 'instagram';

/**
 * Temporary blob storage for Instagram image uploads.
 * Uploads images to Azure Blob Storage so Instagram's API can cURL them,
 * then deletes them after posting completes (success or failure).
 */
export class InstagramBlobService {
  private static loggerInstance: PostyBirbLogger;

  private static get logger(): PostyBirbLogger {
    if (!InstagramBlobService.loggerInstance) {
      InstagramBlobService.loggerInstance = Logger('InstagramBlobService');
    }
    return InstagramBlobService.loggerInstance;
  }

  private static getContainerClient(): ContainerClient {
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    return blobServiceClient.getContainerClient(CONTAINER_NAME);
  }

  /**
   * Upload a file buffer to Azure Blob Storage.
   * @returns The public URL of the uploaded blob and its name for cleanup.
   */
  static async upload(
    buffer: Buffer,
    mimeType: string,
    fileExtension = 'jpg',
  ): Promise<{ url: string; blobName: string }> {
    const containerClient = InstagramBlobService.getContainerClient();

    // Ensure container exists with public blob access
    await containerClient.createIfNotExists({
      access: 'blob',
    });

    const blobName = `${uuid()}.${fileExtension}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
      },
    });

    InstagramBlobService.logger.info(`Uploaded blob: ${blobName}`);

    return {
      url: blockBlobClient.url,
      blobName,
    };
  }

  /**
   * Delete a blob from Azure Blob Storage.
   * Best-effort — logs but does not throw on failure.
   */
  static async delete(blobName: string): Promise<void> {
    try {
      const containerClient = InstagramBlobService.getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
      InstagramBlobService.logger.info(`Deleted blob: ${blobName}`);
    } catch (e) {
      InstagramBlobService.logger.warn(`Failed to delete blob ${blobName}`, e);
    }
  }

  /**
   * Delete multiple blobs. Best-effort cleanup.
   */
  static async deleteAll(blobNames: string[]): Promise<void> {
    await Promise.all(
      blobNames.map((name) => InstagramBlobService.delete(name)),
    );
  }
}
