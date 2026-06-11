/**
 * Relay engine — file processing (resize / convert / thumbnail / verify).
 *
 * Production-faithful port of the legacy file pipeline
 * (FileSubmissionPostManager.resizeOrModifyFile + getResizeParameters +
 * verifyPostingFiles), reusing the proven PostFileResizerService (sharp worker
 * pool) and FileConverterService rather than re-implementing the resize math.
 *
 * Produces ready-to-post PostingFiles (with thumbnails) for a batch, applying:
 *  - mime conversion for unsupported image types (and text alt-file fallback)
 *  - website + user dimension caps (calculateImageResize + per-account override)
 *  - static + dynamic byte-size limits (getSupportedFileSize)
 *  - alt-text truncation and source-url propagation into file metadata
 *  - a post-condition verification that the output mime is accepted
 */

/* eslint-disable no-param-reassign */ // mirrors legacy resizeOrModifyFile: mutates the loaded file in place
import { Injectable } from '@nestjs/common';
import { FileBuffer, type SubmissionFile } from '@postybirb/database';
import {
    FileType,
    type FileSubmission,
    type ImageResizeProps,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { FileConverterService } from '../../file-converter/file-converter.service';
import { getSupportedFileSize } from '../../websites/decorators/supports-files.decorator';
import type { ImplementedFileWebsite } from '../../websites/models/website-modifiers/file-website';
import type { UnknownWebsite } from '../../websites/website';
import { PostingFile } from '../models/posting-file';
import { PostFileResizerService } from '../services/post-file-resizer/post-file-resizer.service';

/** Returns true if `mimeType` is accepted by any entry in `patterns`. */
export function mimeTypeIsAccepted(
  mimeType: string,
  patterns: string[],
): boolean {
  return patterns.some((pattern) => {
    if (pattern === mimeType) return true;
    if (pattern.endsWith('/*')) return mimeType.startsWith(pattern.slice(0, -1));
    if (pattern.endsWith('/')) return mimeType.startsWith(pattern);
    return false;
  });
}

export type ProcessedFileInfo = {
  fileId: string;
  from: { width: number; height: number; bytes: number; mimeType: string };
  to: { width: number; height: number; bytes: number; mimeType: string };
};

export type ProcessBatchResult = {
  files: PostingFile[];
  info: ProcessedFileInfo[];
};

@Injectable()
export class RelayFileProcessor {
  constructor(
    private readonly resizer: PostFileResizerService,
    private readonly converter: FileConverterService,
  ) {}

  /**
   * Process a batch of files for a website + account, returning ready-to-post
   * PostingFiles plus per-file before/after info for tracing.
   */
  async processBatch(
    instance: UnknownWebsite,
    files: SubmissionFile[],
    submission: FileSubmission,
    accountId: string,
    sourceUrls: string[],
  ): Promise<ProcessBatchResult> {
    const info: ProcessedFileInfo[] = [];
    const fileInstance = instance as ImplementedFileWebsite;

    const posting = await Promise.all(
      files.map(async (file) => {
        const before = {
          width: file.width,
          height: file.height,
          bytes: file.size,
          mimeType: file.mimeType,
        };
        const processed = await this.resizeOrModifyFile(
          file,
          submission,
          fileInstance,
        );

        // Propagate source URLs + truncate alt text (legacy parity).
        processed.metadata.sourceUrls = [
          ...(processed.metadata.sourceUrls ?? []),
          ...sourceUrls,
        ].filter((s) => !!s?.trim());

        const maxAltTextLength =
          instance.decoratedProps.fileOptions?.maxAltTextLength;
        if (
          typeof maxAltTextLength === 'number' &&
          maxAltTextLength > 0 &&
          processed.metadata.altText &&
          processed.metadata.altText.length > maxAltTextLength
        ) {
          processed.metadata.altText = processed.metadata.altText.slice(
            0,
            maxAltTextLength,
          );
        }

        info.push({
          fileId: file.id,
          from: before,
          to: {
            width: processed.width,
            height: processed.height,
            bytes: processed.buffer.length,
            mimeType: processed.mimeType,
          },
        });
        return processed;
      }),
    );

    this.verifyPostingFiles(instance, posting);
    return { files: posting, info };
  }

  /** Port of FileSubmissionPostManager.resizeOrModifyFile. */
  private async resizeOrModifyFile(
    file: SubmissionFile,
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
  ): Promise<PostingFile> {
    if (!file.file) {
      await file.load();
    }

    const { fileOptions } = instance.decoratedProps;
    const allowedMimeTypes = fileOptions?.acceptedMimeTypes ?? [];
    const fileType = getFileType(file.mimeType);

    if (fileType === FileType.IMAGE) {
      if (await this.converter.canConvert(file.mimeType, allowedMimeTypes)) {
        file.file = new FileBuffer(
          await this.converter.convert(file.file, allowedMimeTypes),
        );
      }
      const resizeParams = this.getResizeParameters(submission, instance, file);
      return this.resizer.resize({ file, resize: resizeParams });
    }

    if (
      fileType === FileType.TEXT &&
      file.altFile &&
      !mimeTypeIsAccepted(file.mimeType, allowedMimeTypes)
    ) {
      if (await this.converter.canConvert(file.altFile.mimeType, allowedMimeTypes)) {
        file.file = new FileBuffer(
          await this.converter.convert(file.altFile, allowedMimeTypes),
        );
      }
    }

    return new PostingFile(file.id, file.file, file.thumbnail).withMetadata(
      file.metadata,
    );
  }

  /** Port of FileSubmissionPostManager.getResizeParameters. */
  private getResizeParameters(
    submission: FileSubmission,
    instance: ImplementedFileWebsite,
    file: SubmissionFile,
  ): ImageResizeProps | undefined {
    const websiteParams = instance.calculateImageResize(file);
    let resizeParams: ImageResizeProps | undefined = websiteParams
      ? { ...websiteParams }
      : undefined;

    const fileParams =
      file.metadata.dimensions?.[instance.accountId] ??
      file.metadata.dimensions?.default;
    if (fileParams) {
      if (fileParams.width) {
        resizeParams = resizeParams ?? {};
        resizeParams.width = Math.min(
          file.width || Infinity,
          fileParams.width,
          resizeParams.width ?? Infinity,
        );
      }
      if (fileParams.height) {
        resizeParams = resizeParams ?? {};
        resizeParams.height = Math.min(
          file.height || Infinity,
          fileParams.height,
          resizeParams.height ?? Infinity,
        );
      }
    }

    if (!resizeParams?.maxBytes) {
      const supportedFileSize = getSupportedFileSize(instance, file);
      if (supportedFileSize && file.size > supportedFileSize) {
        resizeParams = resizeParams ?? {};
        resizeParams.maxBytes = supportedFileSize;
      }
    }

    return resizeParams;
  }

  /** Port of FileSubmissionPostManager.verifyPostingFiles. */
  private verifyPostingFiles(
    instance: UnknownWebsite,
    postingFiles: PostingFile[],
  ): void {
    const acceptedMimeTypes =
      instance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];
    if (acceptedMimeTypes.length === 0) return;

    postingFiles.forEach((f) => {
      if (!mimeTypeIsAccepted(f.mimeType, acceptedMimeTypes)) {
        throw new Error(
          `Website '${instance.decoratedProps.metadata.displayName}' does not support the file type ${f.mimeType} and attempts to convert it did not resolve the issue`,
        );
      }
    });
  }
}
