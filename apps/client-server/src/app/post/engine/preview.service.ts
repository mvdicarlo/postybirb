/**
 * Relay engine — dry-run preview.
 *
 * Runs the front half of the pipeline (plan + validate + transform) for a
 * submission WITHOUT dispatching to any website. This is the built-in
 * validation/test harness: it shows, per website, the parsed post data, any
 * validation errors, and exactly how each file would be resized/converted.
 *
 * No network calls are made and no job tree is persisted.
 */

import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { SubmissionType } from '@postybirb/types';
import { RelaySubmission } from './pipeline';
import { RelayPipelineDeps } from './pipeline-deps';
import { buildTransformPlan, runTransform, TransformPlan } from './transform';

export type PreviewFileResult = {
  fileId: string;
  fileName: string;
  from: { width: number; height: number; bytes: number; mimeType: string };
  to?: { width: number; height: number; bytes: number; mimeType: string };
  appliedSteps: string[];
  verifyIterations: number;
  excluded?: boolean;
  error?: string;
};

export type PreviewTaskResult = {
  websiteId: string;
  accountId: string;
  supported: boolean;
  validationErrors: string[];
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

  constructor(private readonly deps: RelayPipelineDeps) {}

  async preview(submissionId: string): Promise<PreviewResult> {
    const submission = await this.deps.loadSubmission(submissionId);
    this.logger
      .withMetadata({ submissionId, type: submission.type })
      .info('Running dry-run preview');

    const tasks: PreviewTaskResult[] = [];
    for (const opt of submission.options) {
      // eslint-disable-next-line no-await-in-loop
      tasks.push(await this.previewTask(submission, opt));
    }

    return { submissionId, type: submission.type, tasks };
  }

  private async previewTask(
    submission: RelaySubmission,
    opt: { accountId: string; websiteId: string },
  ): Promise<PreviewTaskResult> {
    const site = this.deps.getWebsite(opt.websiteId, opt.accountId);
    const supported =
      submission.type === SubmissionType.FILE
        ? site.supportsFile
        : site.supportsMessage;

    const result: PreviewTaskResult = {
      websiteId: opt.websiteId,
      accountId: opt.accountId,
      supported,
      validationErrors: [],
      files: [],
    };

    if (!supported) return result;

    if (submission.type === SubmissionType.FILE && site.fileConstraints) {
      for (const file of submission.files) {
        if (file.ignoredWebsites?.includes(opt.accountId)) {
          result.files.push({
            fileId: file.id,
            fileName: file.fileName,
            from: {
              width: file.width,
              height: file.height,
              bytes: file.bytes,
              mimeType: file.mimeType,
            },
            appliedSteps: [],
            verifyIterations: 0,
            excluded: true,
          });
          continue;
        }

        try {
          const websiteResize = site.calculateImageResize?.(file);
          const plan: TransformPlan = buildTransformPlan(
            file,
            opt.accountId,
            site.fileConstraints,
            websiteResize,
          );
          // eslint-disable-next-line no-await-in-loop
          const { output, iterations } = await runTransform(
            file,
            plan,
            this.deps.cache,
            this.deps.encoder,
          );
          result.files.push({
            fileId: file.id,
            fileName: file.fileName,
            from: {
              width: file.width,
              height: file.height,
              bytes: file.bytes,
              mimeType: file.mimeType,
            },
            to: {
              width: output.width,
              height: output.height,
              bytes: output.bytes,
              mimeType: output.mimeType,
            },
            appliedSteps: output.appliedSteps,
            verifyIterations: iterations.length,
          });
        } catch (err) {
          result.files.push({
            fileId: file.id,
            fileName: file.fileName,
            from: {
              width: file.width,
              height: file.height,
              bytes: file.bytes,
              mimeType: file.mimeType,
            },
            appliedSteps: [],
            verifyIterations: 0,
            error: (err as Error).message,
          });
        }
      }
    }

    return result;
  }
}
