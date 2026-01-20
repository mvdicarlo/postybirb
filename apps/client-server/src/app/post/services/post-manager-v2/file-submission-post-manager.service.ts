import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
    AccountId,
    FileSubmission,
    FileSubmissionMetadata,
    FileType,
    ImageResizeProps,
    PostData,
    PostEventType,
    SubmissionFileMetadata,
    SubmissionType,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { chunk } from 'lodash';
import {
    FileBuffer,
    PostRecord,
    Submission,
    SubmissionFile,
} from '../../../drizzle/models';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { NotificationsService } from '../../../notifications/notifications.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
import { getSupportedFileSize } from '../../../websites/decorators/supports-files.decorator';
import {
    ImplementedFileWebsite,
    isFileWebsite,
} from '../../../websites/models/website-modifiers/file-website';
import { UnknownWebsite } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { PostingFile } from '../../models/posting-file';
import { PostFileResizerService } from '../post-file-resizer/post-file-resizer.service';
import { PostEventRepository } from '../post-record-factory';
import { BasePostManager } from './base-post-manager.service';

/**
 * PostManager for file submissions.
 * Handles file batching, resizing, and conversion.
 * @class FileSubmissionPostManager
 */
@Injectable()
export class FileSubmissionPostManager extends BasePostManager {
  protected readonly logger = Logger(this.constructor.name);

  constructor(
    postEventRepository: PostEventRepository,
    websiteRegistry: WebsiteRegistryService,
    postParserService: PostParsersService,
    validationService: ValidationService,
    notificationService: NotificationsService,
    private readonly resizerService: PostFileResizerService,
    private readonly fileConverterService: FileConverterService,
  ) {
    super(
      postEventRepository,
      websiteRegistry,
      postParserService,
      validationService,
      notificationService,
    );
  }

  getSupportedType(): SubmissionType {
    return SubmissionType.FILE;
  }

  protected async attemptToPost(
    entity: PostRecord,
    accountId: AccountId,
    instance: UnknownWebsite,
    data: PostData,
  ): Promise<void> {
    if (!isFileWebsite(instance)) {
      throw new Error(
        `Website '${instance.decoratedProps.metadata.displayName}' does not support file submissions`,
      );
    }

    const submission = entity.submission as Submission<FileSubmissionMetadata>;

    // Order files based on submission order
    const fileBatchSize = Math.max(
      instance.decoratedProps.fileOptions.fileBatchSize ?? 1,
      1,
    );

    const files = this.getFilesToPost(submission, accountId, instance);

    if (files.length === 0) {
      this.logger.info(`No files to post for account ${accountId}`);
      return;
    }

    // Split files into batches based on instance file batch size
    const batches = chunk(files, fileBatchSize);
    let batchIndex = 0;

    for (const batch of batches) {
      batchIndex += 1;
      this.cancelToken.throwIfCancelled();

      // Get source URLs from other accounts for cross-website propagation
      // 1. From current post attempt (other accounts that have already posted)
      const currentPostUrls =
        await this.postEventRepository.getSourceUrlsFromPost(
          entity.id,
          accountId,
        );

      // 2. From prior attempts (resume context, excluding self)
      const priorUrls: string[] = [];
      if (this.resumeContext) {
        for (const [
          priorAccountId,
          urls,
        ] of this.resumeContext.sourceUrlsByAccount.entries()) {
          if (priorAccountId !== accountId) {
            priorUrls.push(...urls);
          }
        }
      }

      // Merge and deduplicate
      const allSourceUrls = [...new Set([...currentPostUrls, ...priorUrls])];

      // Resize files if necessary
      const processedFiles: PostingFile[] = (
        await Promise.all(
          batch.map((submissionFile) =>
            this.resizeOrModifyFile(submissionFile, submission, instance),
          ),
        )
      ).map((f) => {
        const fileWithMetadata = f.withMetadata(f.metadata);
        fileWithMetadata.metadata.sourceUrls = [
          ...(fileWithMetadata.metadata.sourceUrls ?? []),
          ...allSourceUrls,
        ].filter((s) => !!s?.trim());

        return fileWithMetadata;
      });

      // Verify files are supported by the website after all processing
      this.verifyPostingFiles(instance, processedFiles);

      // Post
      this.cancelToken.throwIfCancelled();
      const fileIds = batch.map((f) => f.id);
      this.logger
        .withMetadata({
          batchIndex,
          totalBatches: batches.length,
          totalFiles: files.length,
          totalFilesInBatch: batch.length,
          fileIds,
        })
        .info(`Posting file batch to ${instance.id}`);

      await this.waitForPostingWaitInterval(accountId, instance);
      this.cancelToken.throwIfCancelled();

      const result = await instance.onPostFileSubmission(
        data,
        processedFiles,
        batchIndex,
        this.cancelToken,
      );

      if (result.exception) {
        // Emit FILE_FAILED events for each file in the batch
        const storedBatchIndex = batchIndex; // Capture for closure
        await Promise.all(
          batch.map((file) =>
            this.postEventRepository.insert({
              postRecordId: entity.id,
              accountId,
              eventType: PostEventType.FILE_FAILED,
              fileId: file.id,
              error: {
                message: result.message || 'Unknown error',
                stack: result.exception?.stack,
                stage: result.stage,
                additionalInfo: result.additionalInfo,
              },
              metadata: {
                batchNumber: storedBatchIndex,
                accountSnapshot: {
                  name: instance.account.name,
                  website: instance.decoratedProps.metadata.name,
                },
                fileSnapshot: {
                  fileName: file.fileName,
                  mimeType: file.mimeType,
                  size: file.size,
                  hash: file.hash,
                },
              },
            }),
          ),
        );

        // Behavior is to stop posting if a batch fails
        throw result.exception;
      }

      // Emit FILE_POSTED events for each file in the batch
      const storedBatchIndex = batchIndex; // Capture for closure
      await Promise.all(
        batch.map((file) =>
          this.postEventRepository.insert({
            postRecordId: entity.id,
            accountId,
            eventType: PostEventType.FILE_POSTED,
            fileId: file.id,
            sourceUrl: result.sourceUrl,
            metadata: {
              batchNumber: storedBatchIndex,
              accountSnapshot: {
                name: instance.account.name,
                website: instance.decoratedProps.metadata.name,
              },
              fileSnapshot: {
                fileName: file.fileName,
                mimeType: file.mimeType,
                size: file.size,
                hash: file.hash,
              },
              responseMessage: result.message,
            },
          }),
        ),
      );

      this.logger
        .withMetadata(result)
        .info(`File batch posted to ${instance.id}`);
    }
  }

  /**
   * Get files to post, filtered by resume context and user settings.
   * @private
   * @param {Submission<FileSubmissionMetadata>} submission - The submission
   * @param {AccountId} accountId - The account ID
   * @param {ImplementedFileWebsite} instance - The website instance
   * @returns {SubmissionFile[]} Files to post
   */
  private getFilesToPost(
    submission: Submission<FileSubmissionMetadata>,
    accountId: AccountId,
    instance: ImplementedFileWebsite,
  ): SubmissionFile[] {
    return (
      submission.files
        ?.filter(
          // Filter out files that have been marked by the user as ignored for this website
          (f) => !f.metadata.ignoredWebsites?.includes(accountId),
        )
        .filter(
          // Only post files that haven't been posted (based on resume context)
          (f) => {
            if (!this.resumeContext) return true;
            const postedFiles =
              this.resumeContext.postedFilesByAccount.get(accountId);
            return !postedFiles?.has(f.id);
          },
        )
        .sort((a, b) => {
          const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        }) ?? []
    );
  }

  /**
   * Verify that files are supported by the website.
   * @private
   * @param {UnknownWebsite} websiteInstance - The website instance
   * @param {PostingFile[]} postingFiles - The posting files
   */
  private verifyPostingFiles(
    websiteInstance: UnknownWebsite,
    postingFiles: PostingFile[],
  ): void {
    const acceptedMimeTypes =
      websiteInstance.decoratedProps.fileOptions.acceptedMimeTypes ?? [];
    if (acceptedMimeTypes.length === 0) return;

    postingFiles.forEach((f) => {
      if (!acceptedMimeTypes.includes(f.mimeType)) {
        throw new Error(
          `Website '${websiteInstance.decoratedProps.metadata.displayName}' does not support the file type ${f.mimeType} and attempts to convert it did not resolve the issue`,
        );
      }
    });
  }

  /**
   * Resize or modify a file for posting.
   * @private
   * @param {SubmissionFile} file - The submission file
   * @param {FileSubmission} submission - The file submission
   * @param {ImplementedFileWebsite} instance - The website instance
   * @returns {Promise<PostingFile>} The posting file
   */
  private async resizeOrModifyFile(
    file: SubmissionFile,
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
  ): Promise<PostingFile> {
    if (!file.file) {
      await file.load();
    }

    const fileMetadata: SubmissionFileMetadata = file.metadata;
    let resizeParams: ImageResizeProps | undefined;
    const { fileOptions } = instance.decoratedProps;
    const allowedMimeTypes = fileOptions.acceptedMimeTypes ?? [];
    const fileType = getFileType(file.mimeType);

    if (fileType === FileType.IMAGE) {
      if (
        await this.fileConverterService.canConvert(
          file.mimeType,
          allowedMimeTypes,
        )
      ) {
        // eslint-disable-next-line no-param-reassign
        file.file = new FileBuffer(
          await this.fileConverterService.convert(file.file, allowedMimeTypes),
        );
      }

      resizeParams = this.getResizeParameters(submission, instance, file);

      // User defined dimensions
      const userDefinedDimensions =
        // eslint-disable-next-line @typescript-eslint/dot-notation
        fileMetadata?.dimensions['default'] ??
        fileMetadata?.dimensions[instance.accountId];

      if (userDefinedDimensions) {
        if (userDefinedDimensions.width && userDefinedDimensions.height) {
          resizeParams = resizeParams ?? {};
          if (
            userDefinedDimensions.width > resizeParams.width &&
            userDefinedDimensions.height > resizeParams.height
          ) {
            resizeParams = {
              ...resizeParams,
              width: userDefinedDimensions.width,
              height: userDefinedDimensions.height,
            };
          }
        }
      }

      // We pass to resize even if no resize parameters are set
      // as it handles the bundling to PostingFile
      return this.resizerService.resize({
        file,
        resize: resizeParams,
      });
    }

    if (
      fileType === FileType.TEXT &&
      file.hasAltFile &&
      !allowedMimeTypes.includes(file.mimeType)
    ) {
      // Use alt file if it exists and is a text file
      if (
        await this.fileConverterService.canConvert(
          file.altFile.mimeType,
          allowedMimeTypes,
        )
      ) {
        // eslint-disable-next-line no-param-reassign
        file.file = new FileBuffer(
          await this.fileConverterService.convert(
            file.altFile,
            allowedMimeTypes,
          ),
        );
      }
    }

    return new PostingFile(file.id, file.file, file.thumbnail).withMetadata(
      file.metadata,
    );
  }

  /**
   * Get resize parameters for a file.
   * @private
   * @param {FileSubmission} submission - The file submission
   * @param {ImplementedFileWebsite} instance - The website instance
   * @param {SubmissionFile} file - The submission file
   * @returns {ImageResizeProps | undefined} The resize parameters
   */
  private getResizeParameters(
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
    file: SubmissionFile,
  ): ImageResizeProps | undefined {
    // Use website's own calculation method
    let resizeParams = instance.calculateImageResize(file);

    // Apply user-defined dimensions if set
    const fileParams = file.metadata.dimensions?.[instance.accountId];
    if (fileParams) {
      if (fileParams.width) {
        if (!resizeParams) {
          resizeParams = {};
        }
        resizeParams.width = Math.min(
          file.width,
          fileParams.width,
          resizeParams.width ?? Infinity,
        );
      }
      if (fileParams.height) {
        if (!resizeParams) {
          resizeParams = {};
        }
        resizeParams.height = Math.min(
          file.height,
          fileParams.height,
          resizeParams.height ?? Infinity,
        );
      }
    }

    // Fall back to supported file size if needed
    if (!resizeParams?.maxBytes) {
      const supportedFileSize = getSupportedFileSize(instance, file);
      if (supportedFileSize && file.size > supportedFileSize) {
        if (!resizeParams) {
          resizeParams = {};
        }
        resizeParams.maxBytes = supportedFileSize;
      }
    }

    return resizeParams;
  }
}
