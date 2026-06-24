/**
 * Relay engine — website contract + adapter.
 *
 * The engine works against the abstract {@link RelayWebsite} so it stays
 * testable with mocks. {@link WebsiteInstanceAdapter} bridges the real
 * `UnknownWebsite` (decoratedProps + onPost… methods) onto this contract,
 * reading the new `rateLimitScope` / `sourceDependencyMode` props. No existing
 * website implementation needs to change.
 */

import { RateLimitScope } from '@postybirb/types';
import { isFileWebsite } from '../../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../../websites/website';
import { CancellableToken } from '../models/cancellable-token';
import { PostingFile } from '../models/posting-file';
import { SOURCE_DEPENDENCY_MODES } from './constants';

export type RelayPostResult = { sourceUrl?: string; message?: string };

export type RelaySourceDependencyMode =
  | typeof SOURCE_DEPENDENCY_MODES.ALL
  | typeof SOURCE_DEPENDENCY_MODES.ALL_SETTLED
  | typeof SOURCE_DEPENDENCY_MODES.ANY
  | { count: number };

/**
 * Engine-facing view of a website. Implemented for real by
 * {@link WebsiteInstanceAdapter} and by mocks in tests.
 */
export interface RelayWebsite {
  id: string;
  displayName: string;
  supportsFile: boolean;
  supportsMessage: boolean;
  minimumPostWaitInterval: number;
  rateLimitScope: RateLimitScope;
  fileBatchSize: number;
  acceptsExternalSourceUrls: boolean;
  sourceDependencyMode: RelaySourceDependencyMode;

  calculateImageResize?(file: {
    width: number;
    height: number;
    mimeType: string;
    fileName: string;
  }): { width?: number; height?: number; maxBytes?: number } | undefined;
}

/**
 * Adapter over a concrete website instance. The dispatch helpers
 * (postFile/postMessage) delegate to the real onPost… methods; threading the
 * resized buffers and parsed PostData through lands with the pipeline
 * persistence work.
 */
export class WebsiteInstanceAdapter implements RelayWebsite {
  constructor(public readonly instance: UnknownWebsite) {}

  get id(): string {
    return this.instance.decoratedProps.metadata.name;
  }

  get displayName(): string {
    const { metadata } = this.instance.decoratedProps;
    return metadata.displayName ?? metadata.name;
  }

  get supportsFile(): boolean {
    return isFileWebsite(this.instance);
  }

  get supportsMessage(): boolean {
    return isMessageWebsite(this.instance);
  }

  get minimumPostWaitInterval(): number {
    return this.instance.decoratedProps.metadata.minimumPostWaitInterval ?? 0;
  }

  get rateLimitScope(): RateLimitScope {
    return this.instance.decoratedProps.metadata.rateLimitScope ?? 'account';
  }

  get fileBatchSize(): number {
    return Math.max(1, this.instance.decoratedProps.fileOptions?.fileBatchSize ?? 1);
  }

  get acceptsExternalSourceUrls(): boolean {
    return (
      this.instance.decoratedProps.fileOptions?.acceptsExternalSourceUrls ?? false
    );
  }

  get sourceDependencyMode(): RelaySourceDependencyMode {
    return (
      this.instance.decoratedProps.fileOptions?.sourceDependencyMode ??
      SOURCE_DEPENDENCY_MODES.ALL_SETTLED
    );
  }

  /**
   * Ensure the website session is authenticated, re-logging in if the cached
   * session is not currently logged in. Mirrors the legacy ensureLoggedIn:
   * `login()` is mutex-guarded inside the website instance.
   */
  async ensureLoggedIn(): Promise<void> {
    if (this.instance.getLoginState().isLoggedIn) return;
    const result = await this.instance.login();
    if (!result.isLoggedIn) {
      throw new Error(`Not logged in to ${this.displayName}`);
    }
  }

  async postFile(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postData: any,
    files: PostingFile[],
    token: CancellableToken,
    batch: { index: number; totalBatches: number },
  ): Promise<RelayPostResult> {
    if (!isFileWebsite(this.instance)) {
      throw new Error(`${this.displayName} does not support file submissions`);
    }
    const result = await this.instance.onPostFileSubmission(
      postData,
      files,
      token,
      batch,
    );
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    if (result.exception) throw result;
    return { sourceUrl: result.sourceUrl, message: result.message };
  }

  async postMessage(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    postData: any,
    token: CancellableToken,
  ): Promise<RelayPostResult> {
    if (!isMessageWebsite(this.instance)) {
      throw new Error(`${this.displayName} does not support message submissions`);
    }
    const result = await this.instance.onPostMessageSubmission(postData, token);
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    if (result.exception) throw result;
    return { sourceUrl: result.sourceUrl, message: result.message };
  }
}
