/**
 * Relay  production PipelineDeps wiring.engine 
 *
 * Bridges the engine's abstract {@link PipelineDeps} seams onto the real
 * services:
 *   - getWebsite      -> WebsiteRegistryService + WebsiteInstanceAdapter
 *   - getSubmission   -> SubmissionRepository (mapped to RelaySubmission)
 *   - buildPostData   -> PostParsersService (+ injected upstream source URLs)
 *   - validate        -> ValidationService
 *   - processBatch    -> RelayFileProcessor (convert/resize/thumbnail/verify)
 *   - dispatchFile/Message -> the website adapter, posting the processed files
 *
 * Contexts are loaded per job via {@link prepare} and keyed by jobId, so
 * concurrent jobs that share an account each resolve their own submission
 * context. {@link release} clears a job's context when it finishes.
 */

import { Injectable } from '@nestjs/common';
import {
  Submission,
  SubmissionFile,
  SubmissionRepository,
  WebsiteOptions,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { FileSubmission, IWebsiteOptions } from '@postybirb/types';
import { PostParsersService } from '../../post-parsers/post-parsers.service';
import { ValidationService } from '../../validation/validation.service';
import { UnknownWebsite } from '../../websites/website';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { CancellableToken } from '../models/cancellable-token';
import { PostingFile } from '../models/posting-file';
import { RelayFileProcessor } from './file-processor';
import { RelayJob, RelayTask } from './model';
import { PipelineDeps, RelayDispatchData, RelaySubmission } from './pipeline';
import { RateLimiter } from './rate-limiter';
import { RelayTracer } from './tracer.service';
import { RelaySourceFile } from './transform';
import { RelayWebsite, WebsiteInstanceAdapter } from './websites';

type LoadedContext = {
  relay: RelaySubmission;
  raw: Submission;
  /** fileId -> hydrated submission file (buffers loaded lazily). */
  files: Map<string, SubmissionFile>;
  /** accountId -> resolved website instance */
  instances: Map<string, UnknownWebsite>;
  /** accountId -> website options */
  options: Map<string, WebsiteOptions>;
};

@Injectable()
export class RelayPipelineDeps implements PipelineDeps {
  private readonly logger = Logger(this.constructor.name);

  private readonly submissionRepository = new SubmissionRepository();

  /** Keyed by jobId so concurrent jobs sharing an account stay isolated. */
  private readonly contexts = new Map<string, LoadedContext>();

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly postParsers: PostParsersService,
    private readonly validation: ValidationService,
    private readonly fileProcessor: RelayFileProcessor,
    readonly rateLimiter: RateLimiter,
    readonly tracer: RelayTracer,
  ) {}

  // -------------------------------------------------------------------------
  // Loading / lifecycle
  // -------------------------------------------------------------------------

  /**
   * Load a job's submission and resolve website instances/options + files into
   * a per-job context. Must be called before planning/running the job.
   */
  async prepare(job: RelayJob): Promise<RelaySubmission> {
    const raw = await this.submissionRepository.findById(job.submissionId);
    if (!raw) throw new Error(`Submission ${job.submissionId} not found`);

    const instances = new Map<string, UnknownWebsite>();
    const options = new Map<string, WebsiteOptions>();
    for (const option of raw.options ?? []) {
      if (option.isDefault) continue;
      options.set(option.accountId, option);
      const instance = this.websiteRegistry.findInstance(option.account);
      if (instance) instances.set(option.accountId, instance);
    }

    const files = new Map<string, SubmissionFile>();
    for (const f of raw.files ?? []) files.set(f.id, f);

    const relay: RelaySubmission = {
      id: raw.id,
      type: raw.type,
      title: raw.getSubmissionName?.() ?? raw.id,
      files: (raw.files ?? []).map((f) => this.toSourceMeta(f)),
      options: (raw.options ?? [])
        .filter((o) => !o.isDefault)
        .map((o) => ({ accountId: o.accountId, websiteId: o.account.website })),
    };

    this.contexts.set(job.id, { relay, raw, files, instances, options });
    return relay;
  }

  /** Drop a job's context once it has finished. */
  release(jobId: string): void {
    this.contexts.delete(jobId);
  }

  private toSourceMeta(
    f: SubmissionFile,
  ): RelaySourceFile & { order: number; ignoredWebsites?: string[] } {
    const dimensionOverrides: RelaySourceFile['dimensionOverrides'] = {};
    for (const [accountId, dim] of Object.entries(f.metadata.dimensions ?? {})) {
      dimensionOverrides[accountId] = { width: dim.width, height: dim.height };
    }
    return {
      id: f.id,
      fileName: f.fileName,
      mimeType: f.mimeType,
      width: f.width,
      height: f.height,
      bytes: f.size,
      hash: f.hash,
      altText: f.metadata.altText,
      dimensionOverrides,
      order: f.order ?? 0,
      ignoredWebsites: f.metadata.ignoredWebsites ?? [],
    };
  }

  private context(jobId: string): LoadedContext {
    const ctx = this.contexts.get(jobId);
    if (!ctx) {
      throw new Error(`Job ${jobId} not prepared; call prepare(job) first`);
    }
    return ctx;
  }

  // -------------------------------------------------------------------------
  // PipelineDeps seams
  // -------------------------------------------------------------------------

  getSubmission(jobId: string): RelaySubmission {
    return this.context(jobId).relay;
  }

  getWebsite(jobId: string, websiteId: string, accountId: string): RelayWebsite {
    const instance = this.context(jobId).instances.get(accountId);
    if (!instance) {
      throw new Error(`No website instance for ${websiteId}:${accountId}`);
    }
    return new WebsiteInstanceAdapter(instance);
  }

  async authenticate(task: RelayTask): Promise<void> {
    const instance = this.context(task.jobId).instances.get(task.accountId);
    if (!instance) {
      throw new Error(`No website instance for ${task.websiteId}:${task.accountId}`);
    }
    await new WebsiteInstanceAdapter(instance).ensureLoggedIn();
  }

  async buildPostData(
    task: RelayTask,
    upstreamSourceUrls: string[],
  ): Promise<RelayDispatchData> {
    const ctx = this.context(task.jobId);
    const instance = ctx.instances.get(task.accountId);
    const option = ctx.options.get(task.accountId);
    if (!instance || !option) {
      throw new Error(`Missing instance/options for ${task.accountId}`);
    }
    const postData = await this.postParsers.parse(
      ctx.raw,
      instance,
      option as unknown as IWebsiteOptions,
    );
    return { postData, sourceUrls: upstreamSourceUrls };
  }

  async validate(task: RelayTask, _data: RelayDispatchData): Promise<string[]> {
    const ctx = this.context(task.jobId);
    const option = ctx.options.get(task.accountId);
    if (!option) return [];
    const result = await this.validation.validate(ctx.raw, option);
    return result.errors.map((e) => e.id);
  }

  async processBatch(
    task: RelayTask,
    fileIds: string[],
    sourceUrls: string[],
    _token: CancellableToken,
  ): Promise<PostingFile[]> {
    const ctx = this.context(task.jobId);
    const instance = ctx.instances.get(task.accountId);
    if (!instance) throw new Error(`No instance for ${task.accountId}`);

    const files = fileIds
      .map((id) => ctx.files.get(id))
      .filter((f): f is SubmissionFile => !!f);

    const { files: posting, info } = await this.fileProcessor.processBatch(
      instance,
      files,
      ctx.raw as unknown as FileSubmission,
      task.accountId,
      sourceUrls,
    );

    for (const i of info) {
      this.tracer.emit({
        jobId: task.jobId,
        taskId: task.id,
        account: task.accountId,
        website: task.websiteId,
        level: 'info',
        stage: 'transform',
        event: 'file.resized',
        data: { fileId: i.fileId, from: i.from, to: i.to },
      });
    }

    return posting;
  }

  async dispatchFile(
    website: RelayWebsite,
    data: RelayDispatchData,
    files: PostingFile[],
    token: CancellableToken,
    batch: { index: number; totalBatches: number },
  ) {
    const adapter = website as WebsiteInstanceAdapter;
    return adapter.postFile(data.postData, files, token, batch);
  }

  async dispatchMessage(
    website: RelayWebsite,
    data: RelayDispatchData,
    token: CancellableToken,
  ) {
    const adapter = website as WebsiteInstanceAdapter;
    return adapter.postMessage(data.postData, token);
  }
}
