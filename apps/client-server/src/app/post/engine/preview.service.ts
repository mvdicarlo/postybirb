/**
 * Relay  dry-run preview.engine 
 *
 * Runs the front half of the pipeline (resolve + process files) for a
 * submission WITHOUT dispatching to any website. Built-in validation/test
 * harness: shows, per website, whether it is supported and exactly how each
 * file would be converted/resized (real RelayFileProcessor output). No network
 * calls and nothing persisted.
 */

import { Injectable } from '@nestjs/common';
import { Submission, SubmissionRepository } from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { FileSubmission, SubmissionType } from '@postybirb/types';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { isFileWebsite } from '../../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../../websites/models/website-modifiers/message-website';
import { RelayFileProcessor } from './file-processor';

export type PreviewFileResult = {
  fileId: string;
  fileName: string;
  from: { width: number; height: number; bytes: number; mimeType: string };
  to?: { width: number; height: number; bytes: number; mimeType: string };
  excluded?: boolean;
  error?: string;
};

export type PreviewTaskResult = {
  websiteId: string;
  accountId: string;
  supported: boolean;
  files: PreviewFileResult[];
};

export type PreviewResult = {
  submissionId: string;
  type: SubmissionType;
  tasks: PreviewTaskResult[];
};

@Injectable()
export class RelayPreviewService {
  private readonly logger = Logger(this.constructor.name);

  private readonly submissionRepository = new SubmissionRepository();

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly fileProcessor: RelayFileProcessor,
  ) {}

  async preview(submissionId: string): Promise<PreviewResult> {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) throw new Error(`Submission ${submissionId} not found`);

    this.logger
      .withMetadata({ submissionId, type: submission.type })
      .info('Running dry-run preview');

    const tasks: PreviewTaskResult[] = [];
    for (const option of submission.options ?? []) {
      if (option.isDefault) continue;
      // eslint-disable-next-line no-await-in-loop
      tasks.push(await this.previewOption(submission, option));
    }

    return { submissionId, type: submission.type, tasks };
  }

  private async previewOption(
    submission: Submission,
    option: Submission['options'][number],
  ): Promise<PreviewTaskResult> {
    const instance = this.websiteRegistry.findInstance(option.account);
    const websiteId = option.account.website;
    const { accountId } = option;

    const result: PreviewTaskResult = {
      websiteId,
      accountId,
      supported: false,
      files: [],
    };
    if (!instance) return result;

    result.supported =
      submission.type === SubmissionType.FILE
        ? isFileWebsite(instance)
        : isMessageWebsite(instance);
    if (!result.supported || submission.type !== SubmissionType.FILE) {
      return result;
    }

    const files = submission.files ?? [];
    for (const file of files) {
      const excluded = file.metadata.ignoredWebsites?.includes(accountId);
      const from = {
        width: file.width,
        height: file.height,
        bytes: file.size,
        mimeType: file.mimeType,
      };
      if (excluded) {
        result.files.push({ fileId: file.id, fileName: file.fileName, from, excluded: true });
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        const { info } = await this.fileProcessor.processBatch(
          instance,
          [file],
          submission as unknown as FileSubmission,
          accountId,
          [],
        );
        result.files.push({
          fileId: file.id,
          fileName: file.fileName,
          from,
          to: info[0]?.to,
        });
      } catch (err) {
        result.files.push({
          fileId: file.id,
          fileName: file.fileName,
          from,
          error: (err as Error).message,
        });
      }
    }

    return result;
  }
}
