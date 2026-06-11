/**
 * Relay engine — production PipelineDeps wiring.
 *
 * Bridges the engine's abstract {@link PipelineDeps} seams onto the real
 * services:
 *   - getWebsite      -> WebsiteRegistryService + WebsiteInstanceAdapter
 *   - getSubmission   -> SubmissionRepository (mapped to RelaySubmission)
 *   - buildPostData   -> PostParsersService (+ injected upstream source URLs)
 *   - validate        -> ValidationService
 *   - dispatchFile/Message -> the website adapter, posting the resized buffers
 *
 * Submissions are loaded once via {@link loadSubmission}, which also caches the
 * resolved website instances/options and the source file buffers so the
 * synchronous seams (getWebsite/getSubmission) can serve from memory during a
 * run. A fresh instance is used per run (transform cache is per-run).
 */

import { Injectable } from '@nestjs/common';
import {
    Submission,
    SubmissionFile,
    SubmissionRepository,
    WebsiteOptions,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { IFileBuffer, IWebsiteOptions } from '@postybirb/types';
import { PostParsersService } from '../../post-parsers/post-parsers.service';
import { ValidationService } from '../../validation/validation.service';
import { UnknownWebsite } from '../../websites/website';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { CancellableToken } from '../models/cancellable-token';
import { PostingFile } from '../models/posting-file';
import { RelayTask } from './model';
import {
    PipelineDeps,
    RelayDispatchData,
    RelaySubmission,
} from './pipeline';
import { RateLimiter } from './rate-limiter';
import { SharpEncoder } from './sharp-encoder';
import { RelayTracer } from './tracer.service';
import {
    RelaySourceFile,
    TransformCache,
    TransformedFile
} from './transform';
import { RelayWebsite, WebsiteInstanceAdapter } from './websites';

type LoadedContext = {
  relay: RelaySubmission;
  raw: Submission;
  /** accountId -> resolved website instance */
  instances: Map<string, UnknownWebsite>;
  /** accountId -> website options */
  options: Map<string, WebsiteOptions>;
};

@Injectable()
export class RelayPipelineDeps implements PipelineDeps {
  private readonly logger = Logger(this.constructor.name);

  private readonly submissionRepository = new SubmissionRepository();

  private readonly contexts = new Map<string, LoadedContext>();

  // Per-run collaborators (the scheduler owns lifetimes in PR #4).
  readonly cache = new TransformCache();

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly postParsers: PostParsersService,
    private readonly validation: ValidationService,
    readonly encoder: SharpEncoder,
    readonly rateLimiter: RateLimiter,
    readonly tracer: RelayTracer,
  ) {}

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  /**
   * Load a submission and resolve its website instances/options and file
   * buffers into memory so the synchronous seams can serve from cache.
   */
  async loadSubmission(submissionId: string): Promise<RelaySubmission> {
    const raw = await this.submissionRepository.findById(submissionId);
    if (!raw) throw new Error(`Submission ${submissionId} not found`);

    const instances = new Map<string, UnknownWebsite>();
    const options = new Map<string, WebsiteOptions>();

    for (const option of raw.options ?? []) {
      if (option.isDefault) continue;
      options.set(option.accountId, option);
      const instance = this.websiteRegistry.findInstance(option.account);
      if (instance) instances.set(option.accountId, instance);
    }

    // Load source file buffers in parallel.
    const files = await this.mapFiles(raw.files ?? []);

    const relay: RelaySubmission = {
      id: raw.id,
      type: raw.type,
      title: raw.getSubmissionName?.() ?? raw.id,
      files,
      options: (raw.options ?? [])
        .filter((o) => !o.isDefault)
        .map((o) => ({ accountId: o.accountId, websiteId: o.account.website })),
    };

    this.contexts.set(submissionId, { relay, raw, instances, options });
    return relay;
  }

  private async mapFiles(
    files: SubmissionFile[],
  ): Promise<RelaySubmission['files']> {
    return Promise.all(
      files.map(async (f) => {
        if (!f.file) await f.load('file');
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
          buffer: f.file?.buffer,
          order: f.order ?? 0,
          ignoredWebsites: f.metadata.ignoredWebsites ?? [],
        };
      }),
    );
  }

  private context(submissionId: string): LoadedContext {
    const ctx = this.contexts.get(submissionId);
    if (!ctx) {
      throw new Error(
        `Submission ${submissionId} not loaded; call loadSubmission first`,
      );
    }
    return ctx;
  }

  private contextForTask(task: RelayTask): LoadedContext {
    // task.jobId is opaque here; look up by submission via instance maps.
    for (const ctx of this.contexts.values()) {
      if (ctx.instances.has(task.accountId) || ctx.options.has(task.accountId)) {
        return ctx;
      }
    }
    throw new Error(`No loaded context for task ${task.id}`);
  }

  // -------------------------------------------------------------------------
  // PipelineDeps seams
  // -------------------------------------------------------------------------

  getSubmission(submissionId: string): RelaySubmission {
    return this.context(submissionId).relay;
  }

  getWebsite(websiteId: string, accountId: string): RelayWebsite {
    for (const ctx of this.contexts.values()) {
      const instance = ctx.instances.get(accountId);
      if (instance) return new WebsiteInstanceAdapter(instance);
    }
    throw new Error(`No website instance for ${websiteId}:${accountId}`);
  }

  async buildPostData(
    task: RelayTask,
    upstreamSourceUrls: string[],
  ): Promise<RelayDispatchData> {
    const ctx = this.contextForTask(task);
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
    const ctx = this.contextForTask(task);
    const option = ctx.options.get(task.accountId);
    if (!option) return [];
    const result = await this.validation.validate(ctx.raw, option);
    return result.errors.map((e) => e.id);
  }

  async dispatchFile(
    website: RelayWebsite,
    data: RelayDispatchData,
    files: TransformedFile[],
    token: CancellableToken,
    batch: { index: number; totalBatches: number },
  ) {
    const adapter = website as WebsiteInstanceAdapter;
    const postingFiles = files.map((f) => this.toPostingFile(f));
    return adapter.postFile(data.postData, postingFiles, token, batch);
  }

  async dispatchMessage(
    website: RelayWebsite,
    data: RelayDispatchData,
    token: CancellableToken,
  ) {
    const adapter = website as WebsiteInstanceAdapter;
    return adapter.postMessage(data.postData, token);
  }

  /** Build a PostingFile (website upload shape) from a transformed result. */
  private toPostingFile(f: TransformedFile): PostingFile {
    const buffer = f.buffer ?? Buffer.alloc(0);
    const fileBuffer = {
      id: f.fileId,
      submissionFileId: f.fileId,
      buffer,
      fileName: f.fileName,
      mimeType: f.mimeType,
      width: f.width,
      height: f.height,
      size: buffer.byteLength,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as IFileBuffer;
    return new PostingFile(f.fileId, fileBuffer);
  }
}
