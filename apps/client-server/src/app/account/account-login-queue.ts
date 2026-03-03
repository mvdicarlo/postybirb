import { Logger } from '@postybirb/logger';
import { AccountId } from '@postybirb/types';
import { Mutex } from 'async-mutex';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { AccountService } from './account.service';

/**
 * Manages a queue of account login checks, ensuring that only one login
 * check runs per account at a time. If additional login requests arrive
 * while a check is already in progress, they are coalesced into a single
 * follow-up check rather than being queued individually.
 */
export class AccountLoginQueue {
  private readonly logger = Logger(AccountLoginQueue.name);

  /** Mutex that serializes access to the queue map to prevent race conditions when adding entries. */
  private insertMutex = new Mutex();

  /**
   * @param accountService - Service used to look up account records and emit state-change events.
   * @param websiteRegistry - Registry that resolves an account to its corresponding website instance.
   */
  constructor(
    private readonly accountService: AccountService,
    private readonly websiteRegistry: WebsiteRegistryService,
  ) {}

  /**
   * Per-account state map that tracks whether a login check is currently running
   * and whether an additional check was requested while one was in flight.
   *
   * - `isProcessing` – true while a login check is actively executing.
   * - `additionalCheckReceived` – true when a new request arrives during an
   *    active check, triggering one more check after the current one completes.
   */
  private queue: Record<
    AccountId,
    {
      isProcessing: boolean;
      additionalCheckReceived: boolean;
    }
  > = {};

  /**
   * Enqueue a login check for the given account.
   *
   * - If no check is currently running, one is started immediately.
   * - If a check is already in progress, the request is coalesced: a flag is
   *   set so that exactly one additional check will run after the current one
   *   finishes, avoiding redundant concurrent checks.
   *
   * Access to the queue map is serialized through {@link insertMutex} so that
   * concurrent callers cannot corrupt the per-account state.
   *
   * @param accountId - The ID of the account to check.
   */
  public async add(accountId: AccountId) {
    const release = await this.insertMutex.acquire();
    try {
      // Lazily initialize the queue entry for this account.
      if (!this.queue[accountId]) {
        this.queue[accountId] = {
          isProcessing: false,
          additionalCheckReceived: false,
        };
      }

      const accountQueue = this.queue[accountId];

      if (!accountQueue.isProcessing) {
        // No active check – start one now.
        accountQueue.isProcessing = true;
      } else {
        // A check is already running – mark that another one should follow.
        accountQueue.additionalCheckReceived = true;
        return;
      }

      // Fire-and-forget: the check runs asynchronously and will
      // re-trigger itself if additionalCheckReceived is set.
      this.performLoginCheck(accountId);
    } finally {
      release();
    }
  }

  /**
   * Performs the actual login check for an account.
   *
   * After the check completes (or fails), it inspects the
   * `additionalCheckReceived` flag. If another request was coalesced while
   * this check was running, it recursively triggers one more check.
   * Otherwise it marks the account as no longer processing.
   *
   * @param accountId - The ID of the account to check.
   */
  private async performLoginCheck(accountId: AccountId) {
    try {
      this.logger.info(`Performing login check for account '${accountId}'`);
      const account = await this.accountService.findById(accountId);
      const website = this.websiteRegistry.findInstance(account);
      await this.executeOnLogin(website);
    } finally {
      const accountQueue = this.queue[accountId];
      if (accountQueue.additionalCheckReceived) {
        // Another request came in while we were busy – run one more check.
        accountQueue.additionalCheckReceived = false;
        this.logger.info(
          `Additional login check requested for account '${accountId}' during processing – running another check.`,
        );
        this.performLoginCheck(accountId);
      } else {
        // No pending requests – mark the account as idle.
        accountQueue.isProcessing = false;
      }
    }
  }

  /**
   * Runs the full login lifecycle for a website instance:
   *   1. `onBeforeLogin`  – pre-login setup (e.g. refreshing tokens).
   *   2. Emit account state so the UI reflects the "logging in" status.
   *   3. `onLogin`        – the actual login / session-validation logic.
   *
   * On success or failure the method always:
   *   - Calls `onAfterLogin` for cleanup.
   *   - Emits updated account and website-registry state.
   *
   * @param website - The website instance to log in to.
   */
  private async executeOnLogin(website: UnknownWebsite) {
    try {
      await website.onBeforeLogin();
      // Notify listeners that login has started (e.g. UI loading indicators).
      this.accountService.emit();
      await website.onLogin();
    } catch (e) {
      this.logger.withError(e).error(`onLogin failed for ${website.id}`);
    } finally {
      // Always run post-login hooks and broadcast the final state.
      website.onAfterLogin();
      this.accountService.emit();
      this.websiteRegistry.emit();
    }
  }
}
